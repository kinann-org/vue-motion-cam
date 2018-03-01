(typeof describe === 'function') && describe("VmcBundle", function() {
    const should = require("should");
    const winston = require('winston');
    const EventEmitter = require('events');
    const {
        VmcBundle,
        Timelapse,
        MotionConf,
    } = require('../index');
    const supertest = require('supertest');
    const path = require('path');
    const srcPkg = require("../package.json");
    const rb = require('rest-bundle');
    const rbh = new rb.RbHash();
    const fs = require('fs');
    const APIMODEL_PATH = `api-model/${srcPkg.name}.test.json`;
    const DEFAULT_CONF = new MotionConf().toJSON();
    const DEFAULT_APIMODEL = Object.assign({}, DEFAULT_CONF, { name: 'CAM1' });
    const app = require("../scripts/server.js");

    winston.level = "warn";

    function testRestBundle(app) {
        return app.locals.restBundles.filter(rb => rb.name==='test')[0];
    }
    function testInit() { 
        return app;
    }
    var version = "UNKNOWN";

    it("Initialize TEST suite", function(done) { // THIS TEST MUST BE FIRST
        var async = function*() {
            if (testRestBundle(app) == null) {
                yield app.locals.asyncOnReady.push(async);
            }
            version = yield MotionConf.installedVersion()
                .then(r=>async.next(r)).catch(e=>async.err(e));
            winston.info("test suite initialized");
            done();
        }();
        async.next();
    });
    it("GET /identity returns RestBundle identity", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                var response = yield supertest(app).get("/test/identity").expect((res) => {
                    res.statusCode.should.equal(200);
                    should(res.body).properties({
                        name: 'test',
                        package: srcPkg.name,
                    });
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("GET /motion-conf returns MotionConf apiModel", function(done) {
        var async = function* () {
            try {
                var app = testInit();

                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }
                var response = yield supertest(app).get("/test/motion-conf").expect((res) => {
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    apiModel.type.should.equal("MotionConf");
                    apiModel.version.should.equal(version);
                    apiModel.motion.webcontrol_port.should.equal(8090);
                    apiModel.cameras[0].videodevice.should.equal("/dev/video0");
                    // returned apiModel should be default 
                    apiModel.motion.should.properties(DEFAULT_APIMODEL.motion);
                    var expected = Object.assign({}, DEFAULT_APIMODEL.cameras[0]);
                    delete expected.framesize; // varies
                    apiModel.cameras[0].should.properties(expected);
                    should.ok(apiModel);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("PUT /motion-conf updates MotionConf apiModel", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }

                // request without rbHash should be rejected and current model returned
                var badData = {
                    apiModel: {
                        test: "bad-data",
                    }
                }
                winston.warn("Expected error (BEGIN)");
                var response = yield supertest(app).put("/test/motion-conf").send(badData).expect((res) => {
                    winston.warn("Expected error (END)");
                    res.statusCode.should.equal(400); // BAD REQUEST (no rbHash)
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                var curConf = response.body.data.apiModel;
                should(curConf).properties({
                    type: "MotionConf",
                    version,
                });

                // change camera1 name
                var newConf = Object.assign({}, curConf);
                var putData = {
                    apiModel: newConf,
                };
                newConf.cameras[0].text_left = 'CAM01';
                var response = yield supertest(app).put("/test/motion-conf").send(putData).expect((res) => {
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should.ok(apiModel);
                    apiModel.type.should.equal("MotionConf");
                    should(apiModel.version).equal(version);
                    apiModel.motion.webcontrol_port.should.equal(8090);
                    apiModel.cameras[0].text_left.should.equal("CAM01");
                    should.deepEqual(apiModel, Object.assign({},newConf,{
                        rbHash: rbh.hash(newConf),
                    }));
                    should.ok(apiModel);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("POST /camera/stop stops camera service", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }
                var newConf = Object.assign({}, DEFAULT_CONF);
                var putData = {
                    apiModel: newConf,
                };

                // stop works even if streaming is inactive
                var response = yield supertest(app).post("/test/camera/stop").send("").expect((res) => {
                    res.statusCode.should.equal(200);
                    should.deepEqual(res.body, { camera_streaming: false, });
                }).end((e,r) => e ? async.throw(e) : async.next(r));

                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("EVT_CAMERA_ACTIVATE activates camera", function(done) {
        this.timeout(5000);
        var async = function* () {
            try {
                var emitter = new EventEmitter();
                var vmc = new VmcBundle("test", {
                    emitter,
                });
                should(vmc.streaming).equal(false);
                emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATE, true);
                yield emitter.on(VmcBundle.EVT_CAMERA_ACTIVATED, (active)=> async.next(active));
                should(vmc.streaming).equal(true);
                yield emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATE, false);
                yield setTimeout(() => async.next(), 100); // allow motion to stop
                should(vmc.streaming).equal(false);
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("activateCamera(start) returns promise resolved on activation", function(done) {
        this.timeout(5000);
        var async = function* () {
            try {
                var vmc = new VmcBundle("test");
                should(vmc.streaming).equal(false);
                var r = yield vmc.activateCamera(true).then(r=>async.next(r)).catch(e=>async.throw(e));
                should.deepEqual(r, {
                    camera_streaming: true,
                });
                should(vmc.streaming).equal(true);
                var r = yield vmc.activateCamera(false).then(r=>async.next(r)).catch(e=>async.throw(e));
                should.deepEqual(r, {
                    camera_streaming: false,
                });
                yield setTimeout(() => async.next(), 100); // allow motion to stop
                should(vmc.streaming).equal(false);
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("POST /camera/start starts camera service", function(done) {
        this.timeout(10000);
        var httpTimeout = 2000;
        var async = function* () {
            try {
                var app = testInit();
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }
                var newConf = Object.assign({}, DEFAULT_CONF);
                var putData = {
                    apiModel: newConf,
                };

                // start camera
                var res = yield supertest(app).post("/test/camera/start").timeout(httpTimeout).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                should.deepEqual(res.body, { camera_streaming: true, });

                // stop camera
                var res = yield supertest(app).post("/test/camera/stop").timeout(httpTimeout).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                should.deepEqual(res.body, { camera_streaming: false, });

                // TODO: Eliminate need for this timeout
                yield setTimeout(() => async.next(), 500);

                // re-start camera
                var res = yield supertest(app).post("/test/camera/start").timeout(httpTimeout).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                should.deepEqual(res.body, { camera_streaming: true, });

                // stop camera
                var res = yield supertest(app).post("/test/camera/stop").timeout(httpTimeout).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                should.deepEqual(res.body, { camera_streaming: false, });

                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("GET /devices returns array of video devices", function(done) {
        var async = function* () {
            try {
                var app = testInit();

                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }
                var response = yield supertest(app).get("/test/devices").expect((res) => {
                    res.statusCode.should.equal(200);
                    var devices = res.body;
                    var keys = Object.keys(devices);
                    keys.length.should.above(0);
                    if (fs.existsSync('/dev/video0')) {
                        devices['/dev/video0'].filepath.should.equal('/dev/video0');
                        if (fs.existsSync('/dev/video1')) {
                            should.ok(devices['/dev/video1']);
                        }
                        if (fs.existsSync('/dev/video2')) {
                            should.ok(devices['/dev/video2']);
                        }
                    }
                    for (var i = 0; i < devices.length; i++) {
                        devices[i].should.properties(['filepath', 'signature']);
                    }
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("initialize() loads apiModel and sends EVT_VMC_INITIALIZED", function(done) {
        var async = function*() {
            try {
                var name = "testVmcInit";
                var mc = new MotionConf({
                    motion: {
                        stream_localhost: 'off',
                    },
                });
                class TestVMC extends VmcBundle {
                    constructor(name, opts={}) {
                        super(name, opts);
                    }
                }
                var filename = `${srcPkg.name}.${name}.json`;
                var apiFile = path.join(__dirname, '..', 'api-model', filename);
                var json = mc.toJSON();
                fs.writeFileSync(apiFile, JSON.stringify(json,null,2));
                var eventCount = 0;
                var emitter = new EventEmitter();
                emitter.on(VmcBundle.EVT_VMC_INITIALIZED, () => eventCount++);
                var vmc = new TestVMC(name, { emitter, });
                var config = yield vmc.initialize().then(r=>async.next(r)).catch(e=>async.throw(e));
                should.deepEqual(config, vmc.motionConf.toJSON()); // intialize() resolves to configuration
                should(vmc.motionConf.motion.stream_localhost).equal('off');
                done();
            } catch (e) {
                done(e);
            }
        }();
        async.next();
    });
    it("onDaily(date) performs daily tasks", function(done) {
        var now = new Date();
        var async = function*() { 
            try {
                var testDir = path.join(__dirname, 'onDaily');
                var vmc = new VmcBundle("test_onDaily",{
                    confDir: testDir,
                    motion: {
                        snapshot_interval: 1800,
                    },
                    cameras: [{
                        camera_name: 'camera1',
                        framesize: "800x600",
                    }],
                });
                var date = new Date(2018,1,20);
                var timelapsePath = path.join(testDir,'camera1','timelapse.mp4');
                fs.existsSync(timelapsePath) && fs.unlinkSync(timelapsePath);
                var r = yield vmc.onDaily(date).then(r=>async.next(r)).catch(e=>async.throw(e));
                should(r.timelapses).instanceOf(Array);
                should(r.timelapses.length).equal(1);
                r.timelapses.forEach(tl => should(tl).instanceOf(Timelapse));
                should(r.timelapses[0].image_dir).equal(path.join(testDir,"camera1"));
                should(r.timelapses[0].snapshot_interval).equal(1800);
                should(r.timelapses[0].movie_duration).equal(15);
                should(r.timelapses[0].framerate).approximately(22.4,0.1);
                should(r.timelapses[0].framesize).equal('800x600');
                should(r.timelapses[0].camera_name).equal("camera1");
                should(r.timelapses[0].start_date.getFullYear()).equal(2018);
                should(r.timelapses[0].start_date.getMonth()).equal(1);
                should(r.timelapses[0].start_date.getDate()).equal(13);
                should(r.timelapses[0].end_date.getFullYear()).equal(2018);
                should(r.timelapses[0].end_date.getMonth()).equal(1);
                should(r.timelapses[0].end_date.getDate()).equal(19);
                var stat = fs.statSync(timelapsePath);
                should(stat.ctime).above(now);
                should(stat.size).equal(50509);
                done();
            } catch(e) {
                done(e);
            }
        }();
        async.next();
    });
    it("TESTTESTEVT_VMC_DAILY_EXEC triggers onDaily() ", function(done) {
        var now = new Date();
        var async = function*() { 
            try {
                var testDir = path.join(__dirname, 'onDaily');
                var vmc = new VmcBundle("test_onDaily",{
                    confDir: testDir,
                    motion: {
                        snapshot_interval: 1800,
                    },
                    cameras: [{
                        camera_name: 'camera1',
                        framesize: "800x600",
                    }],
                });
                var date = new Date(2018,1,20);
                var timelapsePath = path.join(testDir,'camera1','timelapse.mp4');
                fs.existsSync(timelapsePath) && fs.unlinkSync(timelapsePath);
                var r = yield(()=>{
                    vmc.emitter.emit(VmcBundle.EVT_VMC_DAILY_EXEC, date);
                    vmc.emitter.on(VmcBundle.EVT_VMC_DAILY_RESULT, r => async.next(r));
                })();
                should(r).not.instanceOf(Error);
                should(r.timelapses).instanceOf(Array);
                should(r.timelapses.length).equal(1);
                r.timelapses.forEach(tl => should(tl).instanceOf(Timelapse));
                should(r.timelapses[0].image_dir).equal(path.join(testDir,"camera1"));
                should(r.timelapses[0].snapshot_interval).equal(1800);
                should(r.timelapses[0].movie_duration).equal(15);
                should(r.timelapses[0].framerate).approximately(22.4,0.1);
                should(r.timelapses[0].framesize).equal('800x600');
                should(r.timelapses[0].camera_name).equal("camera1");
                should(r.timelapses[0].start_date.getFullYear()).equal(2018);
                should(r.timelapses[0].start_date.getMonth()).equal(1);
                should(r.timelapses[0].start_date.getDate()).equal(13);
                should(r.timelapses[0].end_date.getFullYear()).equal(2018);
                should(r.timelapses[0].end_date.getMonth()).equal(1);
                should(r.timelapses[0].end_date.getDate()).equal(19);
                var stat = fs.statSync(timelapsePath);
                should(stat.ctime).above(now);
                should(stat.size).equal(50509);
                done();
            } catch(e) {
                done(e);
            }
        }();
        async.next();
    });
    it("finalize TEST suite", function() {
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})
