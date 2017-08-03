(function(exports) {
    const { spawn } = require('child_process');
    const winston = require("winston");
    const fs = require("fs");
    const path = require("path");
    const appdir = process.cwd();

    class Spawner {
        constructor(options = {}) {
            this.logName = options.logName || path.join(appdir, "spawner.log");
            this.logger = options.logger || new (winston.Logger)({
                transports: [
                    //new (winston.transports.Console)(),
                    new (winston.transports.File)({ filename: this.logName })
                ]
            });
            this.logger.info("Spawner created");
            this.stdOutFilter = options.stdOutFilter || (line => Spawner.LINE_INFO);
            this.stdErrFilter = options.stdErrFilter || this.stdOutFilter;
        }

        static get LINE_INFO() {
            return 1;
        }

        static get LINE_RESOLVE() {
            return 0;
        }

        static get LINE_REJECT() {
            return -1;
        }

        spawn(cmd) {
            const that = this;
            return new Promise((resolve, reject) => {
                try { //todo
                var handled = false;
                function rejectWith(err) {
                    var err = err instanceof Error ? err : new Error(err);
                    that.logger.error(err.stack);
                    reject(err);
                    if (that.process) {
                        try {
                            const pid = that.process.pid;
                            var exists = false;
                            try {
                                process.kill(pid, 0);
                                exists = true;
                            } catch (err) {
                                // no such process
                            }
                            if (exists) {
                                that.logger.info(`killing pid:${pid}`);
                                process.kill(pid);
                            }
                            that.process = null;
                        } catch (err) {
                            that.logger.error(err.stack);
                        }
                    }
                }
                function filterChunk(name, chunk, filter) {
                    var lines = chunk.toString().split("\n");
                    for (let i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        that.logger.info(name, line);
                        if (!handled) {
                            var action = filter.call(that, line);
                            if (action === Spawner.LINE_REJECT) {
                                handled = true;
                                rejectWith(line);
                            } else if (action === Spawner.LINE_RESOLVE) {
                                handled = true;
                                resolve(that.process);
                            }
                        }
                    }
                }

                try {
                    that.status = that.STATUS_UNKNOWN;
                    this.logger.info("Spawner spawning:", cmd);
                    var proc = that.process = spawn(cmd[0], cmd.slice(1));
                    proc.stdout.on('data', (chunk) => filterChunk('stdout', chunk, that.stdOutFilter));
                    proc.stderr.on('data', (chunk) => filterChunk('stderr', chunk, that.stdErrFilter));
                    proc.on('exit', (code,signal) => {
                        that.logger.info("motion exit:", code ? "OK" : `ERR:${code}`, signal);
                    });
                    proc.on('close', (code,signal) => {
                        that.logger.info("motion closed:", code ? "OK" : `ERR:${code}`, signal);
                    });
                    proc.on('error', err => {
                        that.logger.error("motion error:", err.message, err.stack);
                    });
                } catch (err) {
                    rejectWith(err);
                }
            } catch (err) { //todo
                console.log("PANIC"); //todo
            } //todo
            });
        }

    } // class Spawner

    module.exports = exports.Spawner = Spawner;
})(typeof exports === "object" ? exports : (exports = {}));

(typeof describe === 'function') && describe("MotionBundle", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const winston = require("winston");
    const Spawner = exports.Spawner; 
    const appdir = process.cwd();
    const logName = path.join(appdir, "spawner.log");
    
    it("accepts a logger", function(done) {
        var async = function* () {
            try {
                /// default logger
                fs.existsSync(logName) && fs.unlink(logName);
                var ss = new Spawner();
                ss.logger.should.instanceOf(winston.Logger);
                var exists = yield setTimeout(()=>fs.existsSync(logName) ? async.next(true) : async.next(false), 50);
                should.ok(exists);

                // injected logger
                var ss2 = new Spawner({
                    logger: ss.logger,
                });
                ss2.logger.should.equal(ss.logger);

                done();
            } catch (err) {
                console.log(err.message, err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("spawn() launches command", function(done) {
        var async = function*(){
            try {
                var ss = new Spawner({
                    stdOutFilter: (line) => {
                        if (line.match(/green/)) {
                            return Spawner.LINE_RESOLVE;
                        } else if (line.match(/red/)) {
                            return Spawner.LINE_REJECT;
                        } else if (line.match(/four/)) {
                            done(new Error("should never happen"));
                            return Spawner.LINE_REJECT;
                        } else {
                            return Spawner.LINE_INFO;
                        }
                    },
                });
                
                // resolve on green
                var result = yield ss.spawn([
                    'printf', 
                    [   
                        'one',
                        'two',
                        'green',
                        'four',
                        ''].join('\n')
                ]).then(r=>async.next(r)).catch(e=>async.throw(e));
                should.ok(result);
                result.should.equal(ss.process);

                // reject on red
                var result = yield ss.spawn([
                    'printf', 
                    [   
                        'one',
                        'two',
                        'red',
                        'four',
                    ''].join('\n')
                ])
                .then(r=>async.throw(new Error("resolve() not expected")))
                .catch(e=>async.next(e));
                result.should.instanceOf(Error);
                result.message.should.equal('red');

                done();
            } catch(err) {
                console.log(err.message, err.stack);
                done(err);
            }
        }();
        async.next();
    });
})
