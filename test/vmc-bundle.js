(typeof describe === 'function') && describe("VmcBundle", function() {
    const should = require("should");
    const VmcBundle = require("../index").VmcBundle;
    const MotionConf = require("../index").MotionConf;
    const supertest = require('supertest');
    const winston = require('winston');
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

    it("Initialize TEST suite", function(done) { // THIS TEST MUST BE FIRST
        var async = function*() {
            if (testRestBundle(app) == null) {
                yield app.locals.asyncOnReady.push(async);
            }
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
                    apiModel.version.should.equal("3.2");
                    apiModel.motion.webcontrol_port.should.equal(8090);
                    apiModel.cameras[0].videodevice.should.equal("/dev/video0");
                    // returned apiModel should be default 
                    apiModel.motion.should.properties(DEFAULT_APIMODEL.motion);
                    apiModel.cameras[0].should.properties(DEFAULT_APIMODEL.cameras[0]);
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
                var newConf = Object.assign({}, DEFAULT_CONF);
                var putData = {
                    apiModel: newConf,
                };

                // request without rbHash should be rejected
                var response = yield supertest(app).put("/test/motion-conf").send(putData).expect((res) => {
                    res.statusCode.should.equal(400); // BAD REQUEST (no rbHash)
                }).end((e,r) => e ? async.throw(e) : async.next(r));

                // get current apiModel
                var response = yield supertest(app).get("/test/motion-conf").expect((res) => {
                    res.statusCode.should.equal(200);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                var apiModel = response.body.apiModel;

                // change camera1 name
                newConf.rbHash = apiModel.rbHash;
                newConf.cameras[0].text_left = 'CAM01';
                var response = yield supertest(app).put("/test/motion-conf").send(putData).expect((res) => {
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should.ok(apiModel);
                    apiModel.type.should.equal("MotionConf");
                    apiModel.version.should.equal("3.2");
                    apiModel.motion.webcontrol_port.should.equal(8090);
                    apiModel.cameras[0].text_left.should.equal("CAM01");
                    apiModel.rbHash.should.equal(rbh.hash(newConf));
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

                // send bad request
                var response = yield supertest(app).post("/test/camera/stop").send("").expect((res) => {
                    res.statusCode.should.equal(500);
                    res.body.should.match(/test camera is not active/);
                }).end((e,r) => e ? async.throw(e) : async.next(r));

                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
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
                res.body.should.match(/camera started/);

                // stop camera
                var res = yield supertest(app).post("/test/camera/stop").timeout(httpTimeout).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                res.body.should.match(/camera stopped/);

                // TODO: Eliminate need for this timeout
                yield setTimeout(() => async.next(), 500);

                // re-start camera
                var res = yield supertest(app).post("/test/camera/start").timeout(httpTimeout).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                res.body.should.match(/camera started/);

                // stop camera
                var res = yield supertest(app).post("/test/camera/stop").timeout(httpTimeout).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                res.body.should.match(/camera stopped/);

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
