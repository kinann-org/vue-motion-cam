(typeof describe === 'function') && describe("vue-motion-cam", function() {
    const should = require("should");
    const path = require("path");
    const fs = require("fs");
    const child_process = require("child_process");
    const winston = require("winston");
    winston.level = 'warn';
    const MotionConf = exports.MotionConf || require("../index").MotionConf;
    const appDir = process.cwd();
    const confDir = path.join(appDir, ".motion");
    const confName = "motion-test.conf";
    const DEFAULT_VERSION = "3.2.12";
    const confOpts = {
        confDir,
        confName,
    };
    const defaultMotion = {
        ffmpeg_output_movies: "on",
        locate_motion_mode: "on",
        logfile: path.join(confDir, "motion.log"),
        max_movie_time: 60,
        output_pictures: "best",
        output_debug_pictures: "off",
        picture_type: "jpeg",
        quality: 100,
        //process_id_file: path.join(confDir, "pid-test.txt"),
        snapshot_filename: `snap-%Y%m%d-%H%M%S-%$`,
        snapshot_interval: 3600, // every hour
        stream_localhost: "on",
        stream_maxrate: 10,
        stream_quality: 50,
        //target_dir: path.join(appDir,".motion"),
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
    it("MotionConf.installedVersion() returns version number of motion package", function(done) {
        var promise = MotionConf.installedVersion();
        should(promise).instanceOf(Promise);
        promise.then((result) => {
            should.ok(result.match(/[0-9.][0-9.]*[0-9]/), 'could not determine motion version');
            done();
        })
        .catch(err => {
            done(err);
        });
    });
    it("toJSON() return serializable api model", function() {
        var mc = new MotionConf({
            version: DEFAULT_VERSION,
        });
        var apiModel = mc.toJSON();
        should.deepEqual(apiModel.motion, defaultMotion);
        should(apiModel).properties({
            type: "MotionConf",
            version: DEFAULT_VERSION,
        });
        should(apiModel.cameras.length).equal(1);
        should(apiModel.cameras[0]).properties({
            camera_id: 1,
            framesize: '640x480',
            input: -1,
            movie_filename: 'CAM1-%Y%m%d-%H%M%S',
            picture_filename: 'CAM1-%Y%m%d-%H%M%S-%q',
            stream_port: 8091,
        });
    });
    it("motionConf() returns text for motion.conf version 4", function() {
        // version 4 configuration is different
        var mc4 = new MotionConf({
            version: '4.2.10',
            usage: 'custom',
        });
        var conf = mc4.motionConf();
        winston.debug("conf", conf);
        conf.should.match(/# version\t4.2.10/);
        conf.should.match(/\n# usage\tcustom\n/);
        conf.should.match(/\nffmpeg_output_movies\ton\n/);
        conf.should.match(/\nlocate_motion_mode\ton\n/);
        conf.should.match(/\nmax_movie_time\t60\n/);
        conf.should.match(/\noutput_debug_pictures\toff\n/);
        conf.should.match(/\noutput_pictures\tbest\n/);
        conf.should.match(/\npicture_type\tjpeg\n/);
        conf.should.match(/\nquality\t100\n/);
        conf.should.match(/\nstream_localhost\ton\n/);
        conf.should.match(/\nstream_maxrate\t10\n/);
        conf.should.match(/\nstream_quality\t50\n/);
        //conf.should.match(/\ntarget_dir\t.*.motion\n/);
        conf.should.match(/\nwebcontrol_html_output\ton\n/);
        conf.should.match(/\nwebcontrol_localhost\ton\n/);
        conf.should.match(/\nwebcontrol_port\t8090\n/);
        conf.should.match(/\ncamera\t.*camera1.conf\n/);

        // usage: timelapse
        var mc4 = new MotionConf({
            usage: 'timelapse',
            version: '4.3',
        });
        var conf4 = mc4.motionConf();
        winston.debug("conf", conf4);
        conf4.should.match(/# version\t4.3/);
        conf4.should.match(/\n# usage\ttimelapse\n/);
        conf4.should.match(/\nffmpeg_output_movies\toff\n/);
        conf4.should.match(/\nffmpeg_timelapse\t30\n/);
        conf4.should.match(/\nffmpeg_bps\t9999999\n/);
        conf4.should.match(/\nlocate_motion_mode\toff\n/);
        conf4.should.match(/\nmax_movie_time\t86400\n/);
        conf4.should.match(/\noutput_debug_pictures\toff\n/);
        conf4.should.match(/\noutput_pictures\toff\n/);
        conf4.should.match(/\npicture_type\tjpeg\n/);
        conf4.should.match(/\nquality\t100\n/);
        conf4.should.match(/\nstream_localhost\ton\n/);
        conf4.should.match(/\nstream_maxrate\t10\n/);
        conf4.should.match(/\nstream_quality\t50\n/);
        //conf.should.match(/\ntarget_dir\t.*.motion\n/);
        conf4.should.match(/\nwebcontrol_html_output\ton\n/);
        conf4.should.match(/\nwebcontrol_localhost\ton\n/);
        conf4.should.match(/\nwebcontrol_port\t8090\n/);
        conf4.should.match(/\ncamera\t.*camera1.conf\n/);

        // usage: motion-capture
        var mc = new MotionConf({
            usage: 'motion-capture',
            version: '4.3',
        });
        var conf = mc.motionConf();
        winston.debug("conf", conf);
        conf.should.match(/# version\t4.3/);
        conf.should.match(/\n# usage\tmotion-capture\n/);
        conf.should.match(/\nffmpeg_output_movies\ton\n/);
        conf.should.match(/\nffmpeg_timelapse\t0\n/);
        conf.should.match(/\nffmpeg_bps\t400000\n/);
        conf.should.match(/\nlocate_motion_mode\ton\n/);
        conf.should.match(/\nmax_movie_time\t3600\n/);
        conf.should.match(/\noutput_debug_pictures\toff\n/);
        conf.should.match(/\noutput_pictures\ton\n/);
        conf.should.match(/\npicture_type\tjpeg\n/);
        conf.should.match(/\nquality\t100\n/);
        conf.should.match(/\nstream_localhost\ton\n/);
        conf.should.match(/\nstream_maxrate\t10\n/);
        conf.should.match(/\nstream_quality\t50\n/);
        //conf.should.match(/\ntarget_dir\t.*.motion\n/);
        conf.should.match(/\nwebcontrol_html_output\ton\n/);
        conf.should.match(/\nwebcontrol_localhost\ton\n/);
        conf.should.match(/\nwebcontrol_port\t8090\n/);
        conf.should.match(/\ncamera\t.*camera1.conf\n/);
    });
    it("motionConf() returns text for motion.conf version 3.2", function() {
        // version 3.2 stream
        var mc = new MotionConf({
            version: "3.2",
        });
        var conf = mc.motionConf();
        winston.debug("conf", conf);
        conf.should.match(/# version\t3.2/);
        conf.should.match(/\n# usage\tstream\n/);
        conf.should.match(/ffmpeg_cap_new\toff/m);
        conf.should.match(/\nlocate\toff\n/);
        conf.should.match(/\noutput_normal\toff\n/);
        conf.should.match(/\noutput_motion\toff\n/);
        conf.should.match(/\nppm\toff\n/);
        conf.should.match(/\nquality\t100\n/);
        conf.should.match(/\nwebcam_localhost\ton\n/);
        conf.should.match(/\nwebcam_maxrate\t10\n/);
        conf.should.match(/\nwebcam_quality\t50\n/);
        conf.should.match(/\ncontrol_html_output\ton\n/);
        conf.should.match(/\ncontrol_localhost\ton\n/);
        conf.should.match(/\ncontrol_port\t8090\n/);
        conf.should.match(/\nthread\t.*camera1.conf\n/);

        // version 3.2
        var mc = new MotionConf({
            version: "3.2",
            usage: 'custom',
        });
        var conf = mc.motionConf();
        winston.debug("conf", conf);
        conf.should.match(/# version\t3.2/);
        conf.should.match(/\n# usage\tcustom\n/);
        conf.should.match(/\nffmpeg_cap_new\ton\n/);
        conf.should.match(/\nlocate\ton\n/);
        conf.should.match(/\nmax_mpeg_time\t60\n/);
        conf.should.match(/\noutput_normal\toff\n/);
        conf.should.match(/\noutput_motion\tbest\n/);
        conf.should.match(/\nppm\toff\n/);
        conf.should.match(/\nquality\t100\n/);
        conf.should.match(/\nwebcam_localhost\ton\n/);
        conf.should.match(/\nwebcam_maxrate\t10\n/);
        conf.should.match(/\nwebcam_quality\t50\n/);
        //conf.should.match(/\ntarget_dir\t.*.motion\n/);
        conf.should.match(/\ncontrol_html_output\ton\n/);
        conf.should.match(/\ncontrol_localhost\ton\n/);
        conf.should.match(/\ncontrol_port\t8090\n/);
        conf.should.match(/\nthread\t.*camera1.conf\n/);
    });
    it("motionConf() returns text for motion.conf version 3.2.12", function() {
        // version 3.2.12 stream
        var mc = new MotionConf({
            version: "3.2.12",
        });
        var conf = mc.motionConf();
        winston.debug("conf", conf);
        conf.should.match(/# version\t3.2/);
        conf.should.match(/\n# usage\tstream\n/);
        conf.should.match(/ffmpeg_output_movies\toff/m);
        conf.should.match(/\nlocate_motion_mode\toff\n/);
        conf.should.match(/output_debug_pictures\toff/m);
        conf.should.match(/output_pictures\toff/m);
        conf.should.match(/picture_type\toff/);
        conf.should.match(/\nquality\t100\n/);
        conf.should.match(/stream_localhost\ton/m);
        conf.should.match(/stream_maxrate\t10/m);
        conf.should.match(/stream_quality\t50/m);
        conf.should.match(/webcontrol_html_output\ton/m);
        conf.should.match(/webcontrol_localhost\ton/m);
        conf.should.match(/webcontrol_port\t8090/m);
        conf.should.match(/thread\t.*camera1.conf/m);

        // version 3.2
        var mc = new MotionConf({
            version: "3.2",
            usage: 'custom',
        });
        var conf = mc.motionConf();
        winston.debug("conf", conf);
        conf.should.match(/# version\t3.2/);
        conf.should.match(/\n# usage\tcustom\n/);
        conf.should.match(/\nffmpeg_cap_new\ton\n/);
        conf.should.match(/\nlocate\ton\n/);
        conf.should.match(/\nmax_mpeg_time\t60\n/);
        conf.should.match(/\noutput_normal\toff\n/);
        conf.should.match(/\noutput_motion\tbest\n/);
        conf.should.match(/\nppm\toff\n/);
        conf.should.match(/\nquality\t100\n/);
        conf.should.match(/\nwebcam_localhost\ton\n/);
        conf.should.match(/\nwebcam_maxrate\t10\n/);
        conf.should.match(/\nwebcam_quality\t50\n/);
        //conf.should.match(/\ntarget_dir\t.*.motion\n/);
        conf.should.match(/\ncontrol_html_output\ton\n/);
        conf.should.match(/\ncontrol_localhost\ton\n/);
        conf.should.match(/\ncontrol_port\t8090\n/);
        conf.should.match(/\nthread\t.*camera1.conf\n/);
    });
    it("motionConf() has default version", function() {
        var mc  = new MotionConf();
        should(mc.version).equal(DEFAULT_VERSION);
    });
    it("cameraPath(iCam) returns filepath to camera configuration fileconf", function() {
        var mc = new MotionConf();
        mc.cameraPath(0, "/a/b/c").should.equal("/a/b/c/camera1.conf");
    });
    it("version", function() {
        should("3.2").below("3.2.12");
        should("3.2.10").below("3.2.12");
        should("4.0").not.below("3.2.12");
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
        conf3_2[0].should.match(/\nheight\t480\n/);  // v3.2
        conf3_2[0].should.match(/\n# framesize\t640x480\n/);  // v3.2
        var mc = new MotionConf({
            version: "3.2.10",
        });
        var conf = mc.cameraConf();
        conf[0] = conf[0].replace(/3.2.10/,"3.2");
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

        var mc4 = new MotionConf({
            version: "3.2.12",
        });
        var conf = mc4.cameraConf();
        conf.should.instanceOf(Array);
        conf.length.should.equal(1);
        conf[0].should.match(/stream_port\t8091/m);  // v4
        conf[0].should.not.match(/webcam_port\t8091/m);  // v3.2
        conf[0].should.not.match(/input\t-1/m);  // v4

        var mc = new MotionConf({
            version: "3.2",
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
                should(mc.version).equal(DEFAULT_VERSION);
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
                done(err);
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
                var log = fs.readFileSync(logPath).toString();
                if (mc.statusText.indexOf("Started stream") >= 0) {
                    mc.statusText.should.match(/8091/);
                    log.should.match(/Started stream/);
                    log.should.match(/8091/);
                } else if (mc.statusText.indexOf("Waiting for threads to finish") >= 0) {
          //          console.log(mc);
        //            mc.statusText.indexOf(mc.pid).should.above(0);
         //           log.should.match(/Waiting for threads to finish/);
          //          log.should.match(/8091/);
                }
                should.ok(fs.existsSync(logPath));
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
                var res = yield mc.stopCamera().then(r=>async.next(r)).catch(e=>async.throw(e));
                res.status.should.match(/camera streaming is (off|shutting down)/);
                done();
            } catch (err) {
                winston.error(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("bindDevices() binds current devices to saved cameras", function() {
        const webcontrol_port = 9100;
        const mc = new MotionConf({
            motion: { webcontrol_port },
            cameras: [{
                videodevice: '/dev/video0',
                signature: 'bluecamera',
                camera_name: 'mycam1',
            },{
                videodevice: '/dev/video0',
                camera_name: 'mycam2',
            },{
                videodevice: '/dev/video9',
                camera_name: 'mycam3',
            }],
        });
        mc.motion.webcontrol_port.should.equal(webcontrol_port);
        mc.cameras.length.should.equal(3);
        should(mc.cameras[1].signature).equal(undefined);
        const devices = {
            '/dev/video0': {
                filepath: '/dev/video0',
                signature: 'redcamera',
                framesizes: ['640x480'],
            },
            '/dev/video1': {
                filepath: '/dev/video1',
                signature: 'bluecamera',
                framesizes: ['640x480'],
            },
            '/dev/video2': {
                filepath: '/dev/video2',
                signature: 'greencamera',
                framesizes: ['640x480'],
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
        should(mc.cameras[0].camera_name).equal('mycam1');
        should(mc.cameras[1].camera_name).equal('mycam2');
        should(mc.cameras[2].camera_name).equal('mycam3');
        should(mc.cameras[3].camera_name).equal('CAM4'); // auto-generated

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
            framesizes: ['640x480'],
        };
        mc.bindDevices(newDevices);
        for (var i=0; i<oldCameras.length; i++) {
            should.deepEqual(mc.cameras[i], oldCameras[i]);
        };

        // if a device becomes inactive, only camera bound to the device is affected
        const delDevices = JSON.parse(JSON.stringify(devices));
        delete delDevices['/dev/video0'];
        mc.bindDevices(delDevices);
        for (var i=0; i<oldCameras.length; i++) {
            if (mc.cameras[i].signature === 'redcamera') {
                should.deepEqual(mc.cameras[i], Object.assign({}, oldCameras[i], {
                    stream_port: null, // set to null because of inactive device
                }));
            } else {
                should.deepEqual(mc.cameras[i], oldCameras[i]);
            }
        };
    });
})
