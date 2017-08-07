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
        max_movie_time: 60,
        output_pictures: "best",
        output_debug_pictures: "off",
        picture_type: "jpeg",
        quality: 100,
        //process_id_file: path.join(confDir, "pid-test.txt"),
        stream_localhost: "on",
        stream_maxrate: 10,
        stream_quality: 75,
        target_dir: path.join(appDir,".motion"),
        webcontrol_port: 8090,
        webcontrol_html_output: "on",
        webcontrol_localhost: "on",
    };

    it("constructor() creates configuration object", function() {
        var mc = new MotionConf({
            version: 4,
        });
        should.ok(mc.motion);
        should.deepEqual(mc.motion, defaultMotion);

        var customMotion = Object.assign({}, defaultMotion, {
            motion: {
                webcontrol_port: 9090,
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
    it("TESTbindDevices() binds current devices to saved cameras", function() {
        const webcontrol_port = 9100;
        const mc = new MotionConf({
            motion: { webcontrol_port },
            cameras: [{
                videodevice: '/dev/video0',
                signature: 'bluecamera',
                name: 'cam1',
            },{
                videodevice: '/dev/video0',
                name: 'cam2',
            },{
                videodevice: '/dev/video9',
                name: 'cam3',
            }],
        });
        mc.motion.webcontrol_port.should.equal(webcontrol_port);
        mc.cameras.length.should.equal(3);
        should(mc.cameras[1].signature).equal(undefined);
        const devices = {
            '/dev/video0': {
                filepath: '/dev/video0',
                signature: 'redcamera',
            },
            '/dev/video1': {
                filepath: '/dev/video1',
                signature: 'bluecamera',
            },
            '/dev/video2': {
                filepath: '/dev/video2',
                signature: 'greencamera',
            },
        };
        mc.bindDevices(devices);
        // primary binding is on signature (e.g., 'bluecamera')
        should(mc.cameras[0].signature).equal('bluecamera');
        should(mc.cameras[0].videodevice).equal('/dev/video1');

        // alternate binding is on filepath (e.g., '/dev/video0');
        should(mc.cameras[1].signature).equal('redcamera');
        should(mc.cameras[1].videodevice).equal('/dev/video0'); 

        // unbound cameras have no stream_port
        should(mc.cameras[2].signature).equal(undefined);
        should(mc.cameras[2].videodevice).equal('/dev/video9');
        should(mc.cameras[2].stream_port).equal(null);

        // remaining devices are bound to new cameras
        should(mc.cameras[3].signature).equal('greencamera');
        should(mc.cameras[3].videodevice).equal('/dev/video2');

        mc.cameras.length.should.equal(4);

        // cameras are indexed from 1
        should(mc.cameras[0].camera_id).equal(1);
        should(mc.cameras[1].camera_id).equal(2);
        should(mc.cameras[2].camera_id).equal(3);
        should(mc.cameras[3].camera_id).equal(4);

        // bindDevices does not change existing camera order
        should(mc.cameras[0].name).equal('cam1');
        should(mc.cameras[1].name).equal('cam2');
        should(mc.cameras[2].name).equal('cam3');
        should(mc.cameras[3].name).equal('greencamera'); // defaults from signature

        // available cameras are assigned stream ports according to camera_id
        for (var i = 0; i < mc.cameras.length; i++) {
            var camera = mc.cameras[i];
            if (i === 2) { // unavailable camera
                should(camera.stream_port).equal(null);
            } else { // available camera
                should(camera.stream_port).equal(webcontrol_port + camera.camera_id);
            }
        }

        // if devices don't change, re-binding is harmless
        const oldCameras = JSON.parse(JSON.stringify(mc.cameras));
        mc.bindDevices(devices);
        should.deepEqual(mc.cameras, oldCameras);

        // if a new device is added, existing bindings don't change
        const newDevices = JSON.parse(JSON.stringify(devices));
        newDevices['/dev/video3'] = {
            filepath: '/dev/video3',
            signature: 'yellowcamera',
        };
        mc.bindDevices(newDevices);
        for (var i=0; i<oldCameras.length; i++) {
            should.deepEqual(mc.cameras[i], oldCameras[i]);
        };

        // if a device becomes inactive, only that cameras binding changes
        const delDevices = JSON.parse(JSON.stringify(devices));
        delete delDevices['/dev/video0'];
        mc.bindDevices(delDevices);
        for (var i=0; i<oldCameras.length; i++) {
            if (mc.cameras[i].signature === 'redcamera') {
                should.deepEqual(mc.cameras[i], Object.assign({}, oldCameras[i], {
                    stream_port: null, // inactive device
                }));
            } else {
                should.deepEqual(mc.cameras[i], oldCameras[i]);
            }
        };
    });
})
