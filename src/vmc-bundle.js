(function(exports) {
    const express = require('express');
    const EventEmitter = require('events');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const path = require("path");
    const MotionConf = require("./motion-conf");
    const Timelapse = require("./timelapse");
    const V4L2Ctl = require("./v4l2-ctl");
    const {
        RestBundle,
        Scheduler,
    } = require("rest-bundle");
    const Task = Scheduler.Task;
    const appdir = process.cwd();
    const motionDir = path.join(appdir, ".motion");

    // allow motion to change state gracefully by locking out all
    // additional activation commands when an activation is in progress
    const ACTIVATION_LOCKOUT = 1000 * 10;  // 10 seconds matters to Raspberry Pi 3

    class VmcBundle extends RestBundle {
        constructor(name = "test", options = {}) {
            super(name, Object.assign({
                srcPkg,
            }, options));

            this.activationDate = null;
            Object.defineProperty(this, "handlers", {
                value: super.handlers.concat([
                    this.resourceMethod("get", "devices", this.getDevices),
                    this.resourceMethod("get", "motion-conf", this.getMotionConf),
                    this.resourceMethod("put", "motion-conf", this.putMotionConf),
                    this.resourceMethod("post", "camera/toggle", this.postCameraToggle), 
                    this.resourceMethod("post", "camera/start", this.postCameraStart), // deprecated
                    this.resourceMethod("post", "camera/stop", this.postCameraStop), // deprecated
                    this.resourceMethod("post", "timelapse", this.postTimelapse),
                    this.resourceMethod("post", "daily", this.postDaily),
                ]),
            });
            var emitter = this.emitter = options.emitter || new EventEmitter();
            winston.info(`VmcBundle-${this.name}.ctor() on:${VmcBundle.EVT_VMC_INVOKE_DAILY}`);
            emitter.on(VmcBundle.EVT_VMC_INVOKE_DAILY, task => {
                this.onDaily(task.data && task.data.date).then(r => {
                    task.done(r);
                }).catch(e => {
                    winston.error(`EVT_VMC_INVOKE_DAILY failed:`, e.stack);
                    task.done(e);
                });
            });
            winston.info(`VmcBundle-${this.name}.ctor() on:${VmcBundle.EVT_CAMERA_ACTIVATE}`);
            emitter.on(VmcBundle.EVT_CAMERA_ACTIVATE, value => {
                this.onActivateCamera(value);
            });
            this.motionConf = new MotionConf(Object.assign(options, {
                name,
            }));
            this.options = Object.assign({}, options);
            this.devices = [];
            this.streaming = false;
            this.scheduler = new Scheduler({
                emitter,
            });
            this.scheduler.addTask(new Task({
                name: `DailyTimelapse`,
                event_invoke: VmcBundle.EVT_VMC_INVOKE_DAILY,
                msRecur: Scheduler.RECUR_DAILY,
                dueDate: Scheduler.createDueDate(2,30), // create timelapses at 2:30AM to avoid DST glitches
            }));
            this.scheduler.start();
        }

        onInitializeEvents(emitter) {
            winston.info(`VmcBundle.onInitializeEvents(${this.name}) EVT_VMC_INITIALIZED`);
            this.emitter.emit(VmcBundle.EVT_VMC_INITIALIZED);
        }

        static get EVT_CAMERA_ACTIVATE() {return "camera_activate"; }
        static get EVT_CAMERA_ACTIVATED() {return "camera_activated"; }
        static get EVT_VMC_INITIALIZED() {return "vmc_initialized"; }
        static get EVT_VMC_INVOKE_DAILY() {return "vmc_invoke_daily"; }
        static get EVT_VMC_DAILY_RESULT() {return "vmc_daily_result"; }

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

        onDaily(date=new Date()) {
            winston.info(`VmcBundle.onDaily() date:${date}`);
            var that = this;
            return new Promise((resolve, reject) => {
                try {
                    var async = function*() {
                        var result = {
                            timelapses: [],
                        };
                        var end_date = Timelapse.priorDate(date);
                        var mc = that.motionConf;
                        for (var i=0; i<mc.cameras.length; i++) {
                            var camera = mc.cameras[i];
                            var image_dir = path.join(mc.confDir, camera.camera_name);
                            for (var itl = 0; itl < mc.timelapses.length; itl++) {
                                var tl = mc.timelapses[itl];
                                var timelapse = Timelapse.createDailyTimelapse({
                                    end_date,
                                    image_dir,
                                    motionConf: mc,
                                    framerate: tl.fps,
                                    days: tl.days,
                                });
                                result.timelapses.push(timelapse);
                                yield timelapse.createMovie().then(r=>async.next(r)).catch(e=>{
                                    that.emitter.emit(VmcBundle.EVT_VMC_DAILY_RESULT, e);
                                    winston.error(`VmcBundle.onDaily((days:${tl.days}})`, e.stack);
                                    reject(e);
                                    async.throw(e);
                                });
                            }
                        };

                        that.emitter.emit(VmcBundle.EVT_VMC_DAILY_RESULT, result);
                        resolve(result);
                    }();
                    async.next();
                } catch(e) {
                    winston.error(`VmcBundle.onDaily(B)`, e.stack);
                    that.emitter.emit(VmcBundle.EVT_VMC_DAILY_RESULT, e);
                    reject(e);
                }
            });
        }

        onActivateCamera(value) {
            if (this.motionConf.automation) {
                this.activateCamera(!!value).then(r => {
                    winston.debug(`VmcBundle.onActivateCamera(${value}) EVT_CAMERA_ACTIVATE => ok`);
                }).catch(e => {
                    winston.error(`VmcBundle.onActivateCamera(${value}) EVT_CAMERA_ACTIVATE => error`, e.stack);
                });
            } else {
                winston.debug(`VmcBundle.onActivateCamera(${value}) EVT_CAMERA_ACTIVATE => ignored`);
                this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATED, this.streaming);
            }
        }

        activateCamera(start) {
            var status = {
                camera_streaming: start,
            };
            if (start === this.streaming) {
                winston.debug(`VmcBundle.activateCamera(${this.streaming}->${start}) ignored`);
                this.activationDate = null;
                this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATED, start);
                return Promise.resolve(status);
            }
            if (this.motionConf == null) {
                return new Promise((resolve, reject) => {
                    winston.info(`VmcBundle.activateCamera(${start}) on:${VmcBundle.EVT_VMC_INITIALIZED}`);
                    this.emitter.on(VmcBundle.EVT_VMC_INITIALIZED, () => {
                        this.activateCamera(start).then(r => {
                            this.activationDate = null;
                            resolve(r);
                        }).catch(e=>reject(e));
                    });
                });
            }
            if (!this.isActivationEnabled()) {
                var e = new Error("Camera activation in progress. Try again later.");
                winston.info(e.message);
                return Promise.reject(e);
            }
            this.activationDate = new Date();
            winston.debug(`VmcBundle.activateCamera(${this.streaming}->${start})`);
            var that = this;
            return new Promise((resolve, reject) => {
                var mc = that.motionConf;
                winston.info(`VmcBundle.activateCamera(${this.streaming}->${start}) ...`);
                (start ? mc.startCamera() : mc.stopCamera()).then(process => {
                    winston.info(`VmcBundle.activateCamera(${this.streaming}->${start}) ok`);
                    that.streaming = start;
                    this.activationDate = null;
                    this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATED, start);
                    resolve(status);
                }).catch(e => {
                    winston.error(`VmcBundle.activateCamera(${this.streaming}->${start}) error`, e.stack);
                    this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATED, e);
                    reject(e);
                });
            });
        }

        postCameraToggle(req, res, next) {
            var data = req.body;
            if (data.manual) {
                winston.info(`postCameraToggle() camera_streaming:${data.camera_streaming} manual:true`);
                return Object.assign(this.activateCamera(!!data.camera_streaming), {
                    manual: true,
                });
            } else {
                winston.info(`postCameraToggle() camera_streaming:${data.camera_streaming} manual:false`);
                this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATE, !!data.camera_streaming);
                return {
                    camera_streaming: this.streaming,
                    manual: false,
                };
            }
        }

        postCameraStart(req, res, next) { // deprecated
            return this.activateCamera(true);
        }

        postCameraStop(req, res, next) { // deprecated
            return this.activateCamera(false);
        }

        postDaily(req, res, next) {
            return this.onDaily();
        }

        postTimelapse(req, res, next) {
            return new Promise((resolve, reject) => {
                try {
                    var opts = req.body || {};
                    // only allow safe subset of properties
                    var camera_name = opts.camera_name;
                    var start_date = opts.start_date;
                    var end_date = opts.end_date;
                    var  config = {
                        motionConf: this.motionConf,
                        camera_name,
                        start_date,
                        end_date,
                    };
                    if (opts.framerate) {
                        config.framerate = opts.framerate;
                    } else {
                        config.movie_duration = opts.movie_duration || 10;
                    }

                    var timelapse = new Timelapse(config);
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
        
        isActivationEnabled() {
            return this.activationDate == null 
                ? true 
                : (Date.now()-this.activationDate.getTime()) >= ACTIVATION_LOCKOUT;
        }

        getState() {
            return {
                api: 'vmc-bundle',
                streaming: this.streaming,
                enableActivation: this.isActivationEnabled(),
                devices: this.devices,
            };
        }

    } //// class VmcBundle

    module.exports = exports.VmcBundle = VmcBundle;
})(typeof exports === "object" ? exports : (exports = {}));
