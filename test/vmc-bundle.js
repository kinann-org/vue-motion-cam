(typeof describe === 'function') && describe("VmcBundle", function() {
    const should = require("should");
    const VmcBundle = require("../index").VmcBundle;
    const EventEmitter = require('events');
    const MotionConf = require("../index").MotionConf;
    const supertest = require('supertest');
    const winston = require('winston');
    winston.level = "warn";
    const srcPkg = require("../package.json");
    const rb = require('rest-bundle');
    const rbh = new rb.RbHash();
    const fs = require('fs');
    const APIMODEL_PATH = `api-model/${srcPkg.name}.test.motion-conf.json`;
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
                winston.warn("Following error is expected");
                var response = yield supertest(app).put("/test/motion-conf").send(badData).expect((res) => {
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
                should(vmc.streaming).equal(false);
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("TESTTESTactivateCamera(start) returns promise resolved on activation", function(done) {
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
    it("finalize TEST suite", function() {
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})
