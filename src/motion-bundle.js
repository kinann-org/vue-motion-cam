(function(exports) {
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const path = require("path");
    const MotionConf = require("./motion-conf");
    const rb = require("rest-bundle");

    class MotionBundle extends rb.RestBundle {
        constructor(name = "test", options = {}) {
            super(name, Object.assign({
                srcPkg,
            }, options));

            Object.defineProperty(this, "handlers", {
                value: super.handlers.concat([
                    this.resourceMethod("get", "motion-conf", this.getMotionConf),
                    this.resourceMethod("put", "motion-conf", this.putMotionConf),
                ]),
            });
            this.apiFile = `${srcPkg.name}.${this.name}.motion-conf`;
            this.motionConf = new MotionConf();
            this.options = Object.assign({}, options);
        }

        updateMotionConf(conf) {
            this.motionConf = new MotionConf(conf);
        }

        loadApiModel(filePath) {
            return new Promise((resolve, reject) => {
                super.loadApiModel(filePath)
                    .then(model => {
                        try {
                            if (model) {
                                this.updateMotionConf(model);
                                resolve(model);
                            } else if (filePath === this.apiFile) {
                                resolve(this.motionConf.toJSON());
                            } else {
                                throw new Error("unknown api model:" + filePath);
                            }
                        } catch (err) { // implementation error
                            winston.error(err.message, err.stack);
                            reject(err);
                        }
                    })
                    .catch(err => reject(err));
            });
        }

        saveApiModel(model, filePath) {
            return new Promise((resolve, reject) => {
                super.saveApiModel(model, filePath)
                    .then(res => {
                        try {
                            if (filePath === this.apiFile) {
                                this.updateMotionConf(model);
                            }
                            resolve(res);
                        } catch (err) { // implementation error
                            winston.error(err.message, err.stack);
                            reject(err);
                        }
                    })
                    .catch(e => reject(e));
            });
        }

        getMotionConf(req, res, next) {
            return this.getApiModel(req, res, next, this.apiFile);
        }

        putMotionConf(req, res, next) {
            return this.putApiModel(req, res, next, this.apiFile);
        }


    } //// class MotionBundle

    module.exports = exports.MotionBundle = MotionBundle;
})(typeof exports === "object" ? exports : (exports = {}));
