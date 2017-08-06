(typeof describe === 'function') && describe("vue-motion-cam", function() {
    const should = require("should");
    const path = require("path");
    const fs = require("fs");
    const child_process = require("child_process");
    const winston = require("winston");
    const MotionConf = exports.MotionConf || require("../index").MotionConf;
    const appDir = process.cwd();
    const confDir = path.join(appDir, ".motion");
    const confName = "motion-test.conf";
    const confOpts = {
        confDir,
        confName,
    };
    const defaultMotion = {
        ffmpeg_cap_new: "on",
        locate_motion_mode: "on",
        logfile: path.join(confDir, "motion.log"),
        max_movie_time: "60",
        output_pictures: "best",
        output_debug_pictures: "off",
        picture_type: "jpeg",
        quality: "100",
        //process_id_file: path.join(confDir, "pid-test.txt"),
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
        conf3_2[0].should.not.match(/\nstream_port\t8091\n/);  // v4
        conf3_2[0].should.match(/\nwebcam_port\t8091\n/);  // v3.2
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
        conf4[0].should.match(/\nstream_port\t8091\n/);  // v4
        conf4[0].should.not.match(/\nwebcam_port\t8091\n/);  // v3.2
        conf4[0].should.match(/\ninput\t-1\n/);  // v4

        var mc = new MotionConf({
            cameras: [{},{},{
                stream_port:8073,
            }],
        });
        var conf = mc.cameraConf();
        winston.debug("conf", conf);
        conf.should.instanceOf(Array);
        conf.length.should.equal(3);
        conf[0].should.match(/\nwebcam_port\t8091\n/);  // v3.2
        conf[0].should.not.match(/\nstream_port\t8091\n/);  // v4
        conf[1].should.match(/\nwebcam_port\t8092\n/);  // v3.2
        conf[1].should.not.match(/\nstream_port\t8092\n/);  // v4
        conf[2].should.match(/\nwebcam_port\t8073\n/);  // v3.2
        conf[2].should.not.match(/\nstream_port\t8073\n/);  // v4
    });
    it("writeConf() writes configuration file", function(done) {
        var async = function*() {
            try {
                var mc = new MotionConf(confOpts);
                var motion = path.join(confDir, confName);
                var camera1 = path.join(confDir, "camera1.conf");
                if (fs.existsSync(camera1)) {
                    yield fs.unlink(camera1, 
                        (err) => err ? async.throw(err) : async.next(true));
                }
                yield mc.writeConf().then(r=>async.next(r)).catch(e=>async.throw(e));
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
    it("shellCommands() returns motion shell commands", function() {
        var mc = new MotionConf(confOpts);
        var confPath = path.join(confDir, confName);
        should.deepEqual(mc.shellCommands(), {
            startCamera: ['motion', '-c', `${confPath}`],
        });
    });
    it("startCamera() starts motion camera service", function(done) {
        var async = function*() {
            try {
                const logPath = path.join(confDir, 'motion.log');
                fs.existsSync(logPath) && fs.unlinkSync(logPath);
                const mc = new MotionConf(confOpts);
                mc.status.should.equal(mc.STATUS_UNKNOWN);
                var process = yield mc.startCamera().then(r=>async.next(r)).catch(e=>async.throw(e));
                process.should.instanceOf(child_process.ChildProcess);
                process.should.equal(mc.spawner.process);
                mc.status.should.equal(mc.STATUS_OPEN);
                mc.statusText.should.match(/Started stream/);
                mc.statusText.should.match(/8091/);
                should.ok(fs.existsSync(logPath));
                var log = fs.readFileSync(logPath).toString();
                log.should.match(/Started stream/);
                log.should.match(/8091/);
                var response = yield mc.stopCamera().then(r=>async.next(r)).catch(e=>async.throw(e));
                response.should.equal(true);
                done();
            } catch(err) {
                done(err);
            }
        }();
        async.next();
    });
    it("stopCamera() stops motion camera service", function(done) {
        var async = function*() {
            try {
                var mc = new MotionConf();
                yield mc.stopCamera().catch(e=> {
                    e.message.should.match(/camera is not active/);
                    done();
                });
                done(new Error("expected failure"));
            } catch (err) {
                done(err);
            }
        }();
        async.next();
    });
    it("bindDevices() binds current devices to saved cameras", function() {
        var mc = new MotionConf();
        mc.cameras.length.should.equal(1);
        should(mc.cameras[0].description).equal(undefined);
        mc.bindDevices([{
            device: '/dev/video0',
            description: 'redcamera',
        },{
            device: '/dev/video2',
            description: 'bluecamera',
        }]);
        mc.cameras.length.should.equal(2);
        should(mc.cameras[0].description).equal('redcamera');
        should(mc.cameras[0].videodevice).equal('/dev/video0');
        should(mc.cameras[0].available).equal(true);
        should(mc.cameras[1].description).equal('bluecamera');
        should(mc.cameras[1].videodevice).equal('/dev/video2');
        should(mc.cameras[1].available).equal(true);
    });
})
