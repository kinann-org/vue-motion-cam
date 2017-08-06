(typeof describe === 'function') && describe("V4L2Ctl", function() {
    const should = require("should");
    const winston = require("winston");
    const V4L2Ctl = require("../index").V4L2Ctl;
    
    it("TESTlistDevices() returns JSON array describing devices", function(done) {
        var async = function* () {
            try {
                const v4l2 = new V4L2Ctl();
                var devices = yield v4l2.listDevices().then(r=>async.next(r)).catch(e=>async.throw(e));
                devices.should.instanceOf(Array);
                for (var i=0; i < devices.length; i++) {
                    var dev = devices[i];
                    winston.info('devices', devices);
                    dev.should.properties(['device', 'description', 'width', 'height']);
                    dev.device.should.match(/\/dev\/video[0-9][0-9]*/);
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
