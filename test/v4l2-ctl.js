(typeof describe === 'function') && describe("V4L2Ctl", function() {
    const should = require("should");
    const winston = require("winston");
    winston.level = "warn";
    const V4L2Ctl = require("../index").V4L2Ctl;
    
    it("listDevices() returns JSON array describing devices", function(done) {
        var async = function* () {
            try {
                const v4l2 = new V4L2Ctl();
                var devices = yield v4l2.listDevices().then(r=>async.next(r)).catch(e=>async.throw(e));
                var keys = Object.keys(devices);
                for (var i=0; i < keys.length; i++) {
                    var dev = devices[keys[i]];
                    dev.should.properties(['filepath', 'signature', 'width', 'height', 'bounds_default']);
                    dev.filepath.should.match(/\/dev\/video[0-9][0-9]*/);
                }
                done();
            } catch(err) {
                winston.error(err.stack);
                done(err);
            }
        }();
        async.next();
    });
})
