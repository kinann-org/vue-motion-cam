(function(exports) {
    const express = require('express');
    const EventEmitter = require('events');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const path = require("path");
    const MotionConf = require("./motion-conf");
    const Timelapse = require("./timelapse");
    const V4L2Ctl = require("./v4l2-ctl");
    const rb = require("rest-bundle");
    const appdir = process.cwd();
    const motionDir = path.join(appdir, ".motion");

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
                    this.resourceMethod("post", "timelapse", this.postTimelapse),
                ]),
            });
            this.apiFile = `${srcPkg.name}.${this.name}.motion-conf`;
            this.emitter = options.emitter || new EventEmitter();
            this.emitter.on(VmcBundle.EVT_CAMERA_ACTIVATE, value => {
                this.onActivateCamera(value);
            });
            this.updateMotion({
                name: this.name,
            }).then(r => {
                winston.info(`VmcBundle.EVT_VMC_INITIALIZED`);
                this.emitter.emit(VmcBundle.EVT_VMC_INITIALIZED);
            }).catch(e => {
                winston.error(`VmcBundle initialization failed`, e.stack);
            });
            this.options = Object.assign({}, options);
            this.devices = [];
            this.streaming = false;
        }

        static get EVT_CAMERA_ACTIVATE() {return "camera_activate"; }
        static get EVT_CAMERA_ACTIVATED() {return "camera_activated"; }
        static get EVT_VMC_INITIALIZED() {return "vmc_initialized"; }

        updateMotion(conf) {
            var that = this;
            return new Promise((resolve, reject) => {
                var async = function*() {
                    try {
                        var version = yield MotionConf.installedVersion()
                            .then(r=>async.next(r)).catch(e=>async.throw(e));
                        var defaultConf = {
                            name: that.name,
                            version,
                        };
                        if (conf) {
                            conf = Object.assign({}, defaultConf, conf, {
                                version,
                            });
                            that.motionConf = new MotionConf(conf);
                        }
                        that.motionConf = that.motionConf || new MotionConf(defaultConf);
                        new V4L2Ctl().listDevices().then(devices => {
                            that.devices = devices;
                            that.motionConf.bindDevices(devices);
                            resolve( that.motionConf );
                        }).catch(e => reject(e));
                    } catch (err) {
                        winston.warn(err.stack);
                        async.throw(err);
                    }
                }();
                async.next();
            });
        }

        loadApiModel(filePath) {
            return new Promise((resolve, reject) => {
                super.loadApiModel(filePath)
                    .then(model => {
                        try {
                            if (model) {
                                this.updateMotion(model).then(r=>resolve(r.toJSON())).catch(e=>reject(e));
                            } else if (filePath === this.apiFile) {
                                this.updateMotion().then(r=>resolve(r.toJSON())).catch(e=>reject(e));
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
                            this.updateMotion(model).then(r=>resolve(r.toJSON())).catch(e=>reject(e));
                        } catch (err) { // implementation error
                            winston.error(err.message, err.stack);
                            reject(err);
                        }
                    })
                    .catch(e => reject(e));
            });
        }

        bindExpress(rootApp, restHandlers = this.handlers) {
            super.bindExpress(rootApp, restHandlers);
            this.app.use("/motion", express.static(motionDir));
            var vmcdir = path.join(__dirname, "ui");
            winston.info(`/vue-motion-cam/ui => ${vmcdir}`);
            rootApp.use("/vue-motion-cam/ui", express.static(vmcdir));
            return this;
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

        onActivateCamera(value) {
            if (this.motionConf) {
                this._activateCamera(!!value).then(r => {
                    winston.info(`EVT_CAMERA_ACTIVATE ${value} ok`);
                }).catch(e => {
                    winston.error(`EVT_CAMERA_ACTIVATE ${value}`, e.stack);
                });
            } else {
                winston.info(`EVT_CAMERA_ACTIVATE ${value} pending initialization`);
                this.emitter.on(VmcBundle.EVT_VMC_INITIALIZED, () => {
                    this.onActivateCamera(value);
                });
            }
        }

        _activateCamera(start) {
            var status = `camera streaming is ${start?'on':'off'}`;
            if (start === this.streaming) {
                winston.info(`VmcBundle._activateCamera(${this.streaming}->${start}) ignored`);
                this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATED, start);
                return Promise.resolve({ status });
            }
            winston.debug(`VmcBundle._activateCamera(${this.streaming}->${start})`);
            var that = this;
            return new Promise((resolve, reject) => {
                var mc = that.motionConf;
                (start ? mc.startCamera() : mc.stopCamera()).then(process => {
                    winston.info(`VmcBundle._activateCamera(${this.streaming}->${start}) ok`);
                    that.streaming = start;
                    this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATED, start);
                    resolve({ status });
                }).catch(err => {
                    winston.error(`VmcBundle._activateCamera(${this.streaming}->${start}) error`, e.stack);
                    reject(err);
                });
            });
        }

        postCameraStart(req, res, next) {
            return this._activateCamera(true);
        }

        postCameraStop(req, res, next) {
            return this._activateCamera(false);
        }


        postTimelapse(req, res, next) {
            return new Promise((resolve, reject) => {
                try {
                    var opts = req.body || {};
                    // only allow safe subset of properties
                    var camera_name = opts.camera_name;
                    var start_date = opts.start_date;
                    var end_date = opts.end_date;
                    var timelapse = new Timelapse({
                        motionConf: this.motionConf,
                        camera_name,
                        start_date,
                        end_date,
                    });
                    timelapse.createMovie().then(mp4FilePath => {
                        var result = {
                            movie_duration: timelapse.movie_duration,
                            movie_url: `/${this.name}/motion/${camera_name}/timelapse.mp4`,
                            start_date,
                            end_date,
                            framerate: timelapse.framerate,
                            framesize: timelapse.framesize,
                        }
                        resolve(result);
                    }).catch(e => {
                        winston.error("VmcBundle.postTimelapse()", e.stack);
                        reject(e);
                    });
                } catch (e) {
                    winston.error("VmcBundle.postTimelapse()", e.stack);
                    reject(e);
                }
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
