(typeof describe === 'function') && describe("vue-motion-cam", function() {
    const should = require("should");
    const path = require("path");
    const fs = require("fs");
    const winston = require("winston");
    const MotionConf = exports.MotionConf || require("../index").MotionConf;
    const appDir = process.cwd();
    const confDir = path.join(appDir, ".motion");
    const defaultMotion = {
        ffmpeg_cap_new: "on",
        locate_motion_mode: "on",
        logfile: path.join(appDir,".motion","motion.log"),
        max_movie_time: "60",
        output_pictures: "best",
        output_debug_pictures: "off",
        picture_filename: "%v-%Y%m%d%H%M%S-%q",
        picture_type: "jpeg",
        quality: "100",
        snapshot_filename: "%v-%Y%m%d%H%M%S-snapshot",
        stream_localhost: "on",
        stream_maxrate: "10",
        stream_quality: "75",
        target_dir: path.join(appDir,".motion"),
        webcontrol_port: "8090",
        webcontrol_html_output: "on",
        webcontrol_localhost: "on",
    };

    it("constructor() creates configuration object", function() {
        var mc = new MotionConf({
            version: "4",
        });
        should.ok(mc.motion);
        should.deepEqual(mc.motion, defaultMotion);

        var customMotion = Object.assign({}, defaultMotion, {
            motion: {
                webcontrol_port: "9090",
            },
        });

        var mc = new MotionConf(customMotion);
        should.ok(mc.motion);
        mc.motion.should.properties(customMotion.motion);
    });
    it("motionConf() returns text for motion.conf", function() {
        var mc = new MotionConf();
        var conf = mc.motionConf();
        winston.debug("conf", conf);
        conf.should.not.match(/\nwebcontrol_port\t8090\n/); // v4
        conf.should.match(/\ncontrol_port\t8090\n/);    // v3.2
        conf.should.not.match(/\ncamera\t.*camera1.conf\n/);    // v4
        conf.should.match(/\nthread\t.*camera1.conf\n/);    // v3.2
    });
    it("cameraPath(iCam) returns filepath to camera configuration fileconf", function() {
        var mc = new MotionConf();
        mc.cameraPath(0, "/a/b/c").should.equal("/a/b/c/camera1.conf");
    });
    it("cameraConf() returns array of text for cameraX.conf", function() {
        var mc3_2 = new MotionConf({
            version: "3.2",
        });
        var conf3_2 = mc3_2.cameraConf();
        conf3_2.should.instanceOf(Array);
        conf3_2.length.should.equal(1);
        conf3_2[0].should.not.match(/\nstream_port\t8081\n/);  // v4
        conf3_2[0].should.match(/\nwebcam_port\t8081\n/);  // v3.2
        conf3_2[0].should.not.match(/\ninput\t-1\n/);  // v4
        var mc = new MotionConf();
        var conf = mc.cameraConf();
        should.deepEqual(conf, conf3_2);

        var mc4 = new MotionConf({
            version: "4",
        });
        var conf4 = mc4.cameraConf();
        conf4.should.instanceOf(Array);
        conf4.length.should.equal(1);
        conf4[0].should.match(/\nstream_port\t8081\n/);  // v4
        conf4[0].should.not.match(/\nwebcam_port\t8081\n/);  // v3.2
        conf4[0].should.match(/\ninput\t-1\n/);  // v4

        var mc = new MotionConf({
            cameras: [{},{},{
                stream_port:8093,
            }],
        });
        var conf = mc.cameraConf();
        winston.debug("conf", conf);
        conf.should.instanceOf(Array);
        conf.length.should.equal(3);
        conf[0].should.match(/\nwebcam_port\t8081\n/);  // v3.2
        conf[0].should.not.match(/\nstream_port\t8081\n/);  // v4
        conf[1].should.match(/\nwebcam_port\t8082\n/);  // v3.2
        conf[1].should.not.match(/\nstream_port\t8082\n/);  // v4
        conf[2].should.match(/\nwebcam_port\t8093\n/);  // v3.2
        conf[2].should.not.match(/\nstream_port\t8093\n/);  // v4
    });
    it("writeConf() writes configuration file", function(done) {
        var async = function*() {
            try {
                var mc = new MotionConf();
                var confName = "motion-test.conf";
                var motion = path.join(confDir, confName);
                var camera1 = path.join(confDir, "camera1.conf");
                if (fs.existsSync(camera1)) {
                    yield fs.unlink(camera1, 
                        (err) => err ? async.throw(err) : async.next(true));
                }
                yield mc.writeConf(confDir, confName).then(r=>async.next(r)).catch(e=>async.throw(e));
                should.ok(fs.existsSync(confDir));
                should.ok(fs.existsSync(camera1), camera1);
                should.ok(fs.existsSync(motion), motion);
                var confmotion = yield fs.readFile(motion, (e,r)=>e?async.throw(e):async.next(r.toString()));
                should.equal(confmotion, mc.motionConf());
                var confcam1 = yield fs.readFile(camera1, (e,r)=>e?async.throw(e):async.next(r.toString()));
                should.equal(confcam1, mc.cameraConf()[0]);
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
            }
        }();
        async.next();
    });
})
