(function(exports) {
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const path = require("path");
    const MotionConf = require("./motion-conf");
    const V4L2Ctl = require("./v4l2-ctl");
    const rb = require("rest-bundle");

    class VmcBundle extends rb.RestBundle {
        constructor(name = "test", options = {}) {
            super(name, Object.assign({
                srcPkg,
            }, options));

            Object.defineProperty(this, "handlers", {
                value: super.handlers.concat([
                    this.resourceMethod("get", "devices", this.getDevices),
                    this.resourceMethod("get", "motion-conf", this.getMotionConf),
                    this.resourceMethod("put", "motion-conf", this.putMotionConf),
                    this.resourceMethod("post", "camera/start", this.postCameraStart),
                    this.resourceMethod("post", "camera/stop", this.postCameraStop),
                ]),
            });
            this.apiFile = `${srcPkg.name}.${this.name}.motion-conf`;
            this.updateMotionConf({
                name: this.name,
            });
            this.options = Object.assign({}, options);
            this.devices = [];
            this.streaming = false;
        }

        updateMotionConf(conf) {
            return new Promise((resolve, reject) => {
                var defaultConf = {
                    name: this.name,
                };
                if (conf) {
                    var conf = Object.assign({}, conf, defaultConf);
                    this.motionConf = new MotionConf(conf);
                }
                this.motionConf = this.motionConf || new MotionConf(defaultConf);
                new V4L2Ctl().listDevices().then(devices => {
                    this.devices = devices;
                    this.motionConf.bindDevices(devices);
                    resolve( this.motionConf );
                }).catch(e => reject(e));
            });
        }

        loadApiModel(filePath) {
            return new Promise((resolve, reject) => {
                super.loadApiModel(filePath)
                    .then(model => {
                        try {
                            if (model) {
                                this.updateMotionConf(model).then(r=>resolve(r.toJSON())).catch(e=>reject(e));
                            } else if (filePath === this.apiFile) {
                                this.updateMotionConf().then(r=>resolve(r.toJSON())).catch(e=>reject(e));
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
                            if (filePath !== this.apiFile) {
                                throw new Error(`filePath expected:${this.apiFile} actual:${filePath}`);
                            }
                            this.updateMotionConf(model).then(r=>resolve(r.toJSON())).catch(e=>reject(e));
                        } catch (err) { // implementation error
                            winston.error(err.message, err.stack);
                            reject(err);
                        }
                    })
                    .catch(e => reject(e));
            });
        }

        getDevices(req, res, next) {
            var that = this;
            return new V4L2Ctl().listDevices().then(r => (that.devices=r));
        }

        getMotionConf(req, res, next) {
            return this.getApiModel(req, res, next, this.apiFile);
        }

        putMotionConf(req, res, next) {
            return this.putApiModel(req, res, next, this.apiFile);
        }

        postCameraStart(req, res, next) {
            return new Promise((resolve, reject) => {
                this.motionConf.startCamera().then(process => {
                    this.streaming = true;
                    resolve({
                        status: `camera streaming is on`,
                    });
                }).catch(err => {
                    winston.error(err.stack);
                    reject(err);
                });
            });
        }

        postCameraStop(req, res, next) {
            return new Promise((resolve, reject) => {
                this.motionConf.stopCamera()
                .then(response => {
                    this.streaming = false;
                    resolve({
                        status: `camera streaming is off`,
                    });
                }).catch(err => {
                    winston.error(err.stack);
                    reject(err);
                });
            });
        }

        getState() {
            return {
                api: 'vmc-bundle',
                streaming: this.streaming,
                devices: this.devices,
            };
        }


    } //// class VmcBundle

    module.exports = exports.VmcBundle = VmcBundle;
})(typeof exports === "object" ? exports : (exports = {}));
