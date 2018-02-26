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
            this.emitter = options.emitter || new EventEmitter();
            this.emitter.on(VmcBundle.EVT_CAMERA_ACTIVATE, value => {
                this.onActivateCamera(value);
            });
            this.motionConf = new MotionConf(Object.assign(options, {
                name,
            }));
            this.loadApiModel().then(r => {
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

        scanSystem(conf) {
            var that = this;
            return new Promise((resolve, reject) => {
                var async = function*() {
                    try {
                        var version = yield MotionConf.installedVersion()
                            .then(r=>async.next(r)).catch(e=>async.throw(e));
                        if (conf) {
                            conf = Object.assign({}, that.motionConf, conf);
                            that.motionConf = new MotionConf(conf);
                        }
                        that.motionConf.version = version;
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

        loadApiModel(name) {
            return new Promise((resolve, reject) => {
                super.loadApiModel(name).then(model => {
                    this.scanSystem(model).then(r=>resolve(r.toJSON())).catch(e=>reject(e));
                }).catch(err => reject(err));
            });
        }

        saveApiModel(model, name) {
            return new Promise((resolve, reject) => {
                super.saveApiModel(model, name)
                    .then(res => {
                        try {
                            this.scanSystem(model).then(r=>resolve(r.toJSON())).catch(e=>reject(e));
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
            return this.getApiModel(req, res, next, this.name);
        }

        putMotionConf(req, res, next) {
            return this.putApiModel(req, res, next, this.name);
        }

        onActivateCamera(value) {
            this.activateCamera(!!value).then(r => {
                winston.info(`VmcBundle.onActivateCamera(${value}) EVT_CAMERA_ACTIVATE => ok`);
            }).catch(e => {
                winston.error(`VmcBundle.onActivateCamera(${value}) EVT_CAMERA_ACTIVATE => error`, e.stack);
            });
        }

        activateCamera(start) {
            var status = {
                camera_streaming: start,
            };
            if (start === this.streaming) {
                winston.info(`VmcBundle.activateCamera(${this.streaming}->${start}) ignored`);
                this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATED, start);
                return Promise.resolve(status);
            }
            if (this.motionConf == null) {
                return new Promise((resolve, reject) => {
                    winston.info(`VmcBundle.activateCamera(${start}) pending initialization...`);
                    this.emitter.on(VmcBundle.EVT_VMC_INITIALIZED, () => {
                        this.activateCamera(start).then(r => resolve(r)).catch(e=>reject(e));
                    });
                });
            }
            winston.debug(`VmcBundle.activateCamera(${this.streaming}->${start})`);
            var that = this;
            return new Promise((resolve, reject) => {
                var mc = that.motionConf;
                winston.info(`VmcBundle.activateCamera(${this.streaming}->${start}) ...`);
                (start ? mc.startCamera() : mc.stopCamera()).then(process => {
                    winston.info(`VmcBundle.activateCamera(${this.streaming}->${start}) ok`);
                    that.streaming = start;
                    this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATED, start);
                    resolve(status);
                }).catch(e => {
                    winston.error(`VmcBundle.activateCamera(${this.streaming}->${start}) error`, e.stack);
                    reject(e);
                });
            });
        }

        postCameraStart(req, res, next) {
            return this.activateCamera(true);
        }

        postCameraStop(req, res, next) {
            return this.activateCamera(false);
        }


        postTimelapse(req, res, next) {
            return new Promise((resolve, reject) => {
                try {
                    var opts = req.body || {};
                    // only allow safe subset of properties
                    var camera_name = opts.camera_name;
                    var start_date = opts.start_date;
                    var end_date = opts.end_date;
                    var movie_duration = opts.movie_duration || 15;
                    var timelapse = new Timelapse({
                        motionConf: this.motionConf,
                        camera_name,
                        start_date,
                        end_date,
                        movie_duration,
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
