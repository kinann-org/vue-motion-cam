(typeof describe === 'function') && describe("MotionBundle", function() {
    const should = require("should");
    const MotionBundle = require("../index").MotionBundle;
    const MotionConf = require("../index").MotionConf;
    const supertest = require('supertest');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const rb = require('rest-bundle');
    const rbh = new rb.RbHash();
    const fs = require('fs');
    const APIMODEL_PATH = `api-model/${srcPkg.name}.test.motion-conf.json`;
    const DEFAULT_CONF = new MotionConf().toJSON();
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
                    apiModel.motion.webcontrol_port.should.equal("8090");
                    apiModel.cameras[0].videodevice.should.equal("/dev/video0");
                    // returned apiModel should be default 
                    apiModel.rbHash.should.equal(rbh.hash(DEFAULT_CONF));
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

                // send bad request
                var response = yield supertest(app).put("/test/motion-conf").send(putData).expect((res) => {
                    res.statusCode.should.equal(400);
                }).end((e,r) => e ? async.throw(e) : async.next(r));

                // change camera1 name
                newConf.rbHash = rbh.hash(newConf);
                newConf.cameras[0].text_left = 'CAM01';
                var response = yield supertest(app).put("/test/motion-conf").send(putData).expect((res) => {
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should.ok(apiModel);
                    apiModel.type.should.equal("MotionConf");
                    apiModel.version.should.equal("3.2");
                    apiModel.motion.webcontrol_port.should.equal("8090");
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
    it("TESTPOST /camera/start starts camera service", function(done) {
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
                var res = yield supertest(app).post("/test/camera/start").timeout(1000).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                res.body.should.match(/camera started/);

                // stop camera
                var res = yield supertest(app).post("/test/camera/stop").timeout(1000).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                res.body.should.match(/camera stopped/);

                // TODO: Eliminate need for this timeout
                yield setTimeout(() => async.next(), 500);

                // re-start camera
                var res = yield supertest(app).post("/test/camera/start").timeout(1000).send("")
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should.ok(res);
                res.statusCode.should.equal(200);
                res.body.should.match(/camera started/);

                // stop camera
                var res = yield supertest(app).post("/test/camera/stop").timeout(1000).send("")
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
    it("finalize TEST suite", function() {
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})
