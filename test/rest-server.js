(typeof describe === 'function') && describe("RestServer", function() {
    const should = require("should");
    const RestServer = require("../src/rest-server");
    const supertest = require('supertest');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const rb = require('rest-bundle');
    const fs = require('fs');
    const DRIVES_PATH = `api-model/${srcPkg.name}.test.drives.json`;
    var rbh = new rb.RbHash();
    var app = require("../scripts/server.js");
    winston.level = "warn";

    var application_json_200 = {
        statusCode: 200,
        type: "application/json",
    }
    function testRestBundle(app) {
        return app.locals.restBundles.filter(rb => rb.name==='test')[0];
    }
    function testInit() { // initialize singleton for each test
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
    it("finalize TEST suite", function() {
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})
