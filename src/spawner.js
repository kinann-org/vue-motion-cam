(function(exports) {
    const { spawn } = require('child_process');
    const winston = require("winston");
    const fs = require("fs");
    const path = require("path");
    const appdir = process.cwd();

    class Spawner {
        constructor(options = {}) {
            this.logName = options.logName || path.join(appdir, "spawner.log");
            this.logger = options.logger;
            this.logConsole = options.logConsole == null ? false : options.logConsole;
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

        initializeLog() {
            var ms = Date.now() - new Date(2017,0);
            var filename = `${this.logName}`;
            var fd = fs.openSync(filename, 'w');
            var ws = fs.createWriteStream(null, { fd });
            var logOpts = {
                json: false,
                timestamp: () => new Date().toLocaleTimeString([], { hour12: false, }),
                formatter: (options) => {
                    var result =  options.timestamp() +' '+ 
                        options.level.toUpperCase() +' '+ 
                        (options.message ? options.message : '');
                    try {
                        if (options.meta) {
                            var keys = Object.keys(options.meta);
                            if (keys.length) {
                                result +=  ' '+ (options.meta.message != null 
                                    ? options.meta.message : JSON.stringify(options.meta));
                            }
                        }
                        return result;
                    } catch (err) {
                        console.log("winston logging error", err, Object.keys(options.meta));
                        return result + err.message;
                    }
                },
            };
            var transports = [
                new (winston.transports.File)(Object.assign({stream:ws},logOpts)),
            ];
            this.logConsole && transports.push( new (winston.transports.Console)(logOpts) );
            this.logger = new (winston.Logger)({ transports });
        }

        kill() {
            return new Promise((resolve, reject) => {
                if (this.process) {
                    const pid = this.process.pid;
                    try {
                        process.kill(pid, 0);
                        this.logger.info(`Spawner kill(${this.process.pid}) kill signal sent`);
                        process.kill(this.process.pid);
                    } catch (err) {
                        this.logger.info(`Spawner kill(${this.process.pid}) ignored: process not found`);
                    }
                    this.process = null;
                    resolve(true);
                } else {
                    reject(new Error("Spawner kill() ignored: no process to kill"));
                }
            });
        }

        spawn(cmd) {
            const that = this;
            try {
                that.logger || that.initializeLog();
                that.logger.info("Spawner spawning:", cmd.join(" "));
            } catch (err) {
                return Promise.reject(err);
            }
            return new Promise((resolve, reject) => {
                var handled = false;
                function rejectWith(err) {
                    var err = err instanceof Error ? err : new Error(err);
                    winston.error(`Spawner.spawn().rejectWithErr()`, err.stack);
                    that.logger.error(err.stack);
                    reject(err);
                    if (that.process) {
                        that.kill().catch(e => that.logger.error(e.stack));
                    }
                }
                function filterChunk(chunk, filter) {
                    var lines = chunk.toString().split("\n");
                    for (let i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (!line.length) {
                            continue;
                        }
                        that.logger.info(line);
                        if (!handled) {
                            var action = filter(line);
                            if (action === Spawner.LINE_REJECT) {
                                handled = true;
                                winston.error(`Spawner reject( ${line} )`);
                                that.logger.info(`Spawner reject( ${line} )`);
                                rejectWith(line);
                            } else if (action === Spawner.LINE_RESOLVE) {
                                handled = true;
                                winston.info(`Spawner resolve( process:${that.process.pid} )`);
                                that.logger.info(`Spawner resolve( process:${that.process.pid} )`);
                                resolve(that.process);
                            } else {
                                winston.debug(`Spawner ignoring:`, line);
                            }
                        }
                    }
                }

                try {
                    var proc = that.process = spawn(cmd[0], cmd.slice(1));
                    winston.info("Spawner spawned pid:", proc.pid);
                    that.logger.info("Spawner spawned pid:", proc.pid);
                    proc.stdout.on('data', (chunk) => filterChunk(chunk, that.stdOutFilter));
                    proc.stderr.on('data', (chunk) => filterChunk(chunk, that.stdErrFilter));
                    proc.on('exit', (code,signal) => {
                        that.logger.info(`Spawner exit:${code} signal:${signal}`);
                    });
                    proc.on('close', (code,signal) => {
                        that.logger.info(`Spawner closed:${code} signal:${signal}`);
                        if (!handled) {
                            var err = new Error("Spawner child process EOF");
                            winston.error(err.stack);
                            reject(err);
                            handled = true;
                        }
                    });
                    proc.on('error', err => {
                        that.logger.error("Spawner error:", err.message, err.stack);
                    });
                } catch (err) {
                    winston.error("Spawner.spawn", err.stack);
                    rejectWith(err);
                }
            });
        }

    } // class Spawner

    module.exports = exports.Spawner = Spawner;
})(typeof exports === "object" ? exports : (exports = {}));
