(typeof describe === 'function') && describe("Spawner", function() {
    const should = require("should");
    const { ChildProcess } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const winston = require("winston");
    winston.level = "warn";
    const Spawner = require("../index").Spawner;
    const appdir = process.cwd();
    const logName = path.join(appdir, "spawner.log");
    
    it("accepts a logger or creates its own", function(done) {
        var async = function* () {
            try {
                /// default logger
                fs.existsSync(logName) && fs.unlinkSync(logName);
                var ss = new Spawner({
                    stdOutFilter: (line) => 
                        line.match(/hello/) 
                        ? Spawner.LINE_RESOLVE
                        : Spawner.LINE_REJECT,
                });
                should.ok(ss.logger == null);
                should.ok(!fs.existsSync(logName));
                var result = yield ss.spawn(['echo','hello']).then(r=>async.next(r)).catch(r=>async.next(r));
                result.should.instanceOf(ChildProcess);
                ss.logger.should.instanceOf(winston.Logger);
                should.ok(fs.existsSync(logName));

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
                winston.error("Expected error (BEGIN)");
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
                winston.error("Expected error (END)");
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
