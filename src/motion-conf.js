(function(exports) {
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const path = require("path");
    const motion3_2 = {
        ffmpeg_cap_new: 'ffmpeg_output_movies',
        camera: 'thread',
        event_gap: 'gap',
        ffmpeg_output_debug_movies: 'ffmpeg_cap_motion', 
        ffmpeg_output_movies: 'ffmpeg_cap_new', 
        location_motion_mode: 'locate',
        max_movie_time: 'max_mpeg_time',
        output_debug_pictures: 'output_normal',
        output_motion: 'output_pictures',
        jpeg_filename: 'picure_filename',
        picture_type: 'ppm',
        stream_limit: 'webcam_limit',
        stream_localhost: 'webcam_localhost',
        stream_maxrate: 'webcam_maxrate',
        stream_motion: 'webcam_motion',
        stream_port: 'webcam_port',
        stream_quality: 'webcam_quality',
        webcontrol_authentication: 'control_authentication',
        webcontrol_html_output: 'control_html_output',
        webcontrol_localhost: 'control_localhost',
        webcontrol_port: 'control_port',
    }

    class MotionConf {
        constructor(options = {}) {
            var appdir = path.dirname(__dirname);
            this.motion = Object.assign({
                ffmpeg_cap_new: "on",
                locate: "on",
                locate_motion_mode: "on",
                logfile: path.join(appdir,".motion","motion.log"),
                max_movie_time: "60",
                output_pictures: "best",
                picture_filename: "%v-%Y%m%d%H%M%S-%q",
                picture_type: "jpeg",
                quality: "100",
                snapshot_filename: "%v-%Y%m%d%H%M%S-snapshot",
                stream_localhost: "on",
                stream_maxrate: "10",
                stream_preview_newline: "on",
                stream_quality: "75",
                target_dir: path.join(appdir,".motion"),
                webcontrol_html_output: "on",
                webcontrol_localhost: "on",
                webcontrol_port: "8080",
            }, options.motion);
            var nCams = options.camera && options.camera.length || 1;
            var optionCams = options.camera && options.camera.length || [{}];
            var camera = new Array(nCams).fill({});
            this.camera = camera.map((cam, i) => Object.assign({
                camera_id: i+1,
                videodevice: "/dev/video"+i,
                input: -1,
                text_left: `CAMERA ${i+1}`,
                target_dir: path.join(__dirname, ".motion", `cam${i+1}`),
                picture_filename: `CAM${i+1}_%v-%Y%m%d%H%M%S-%q`,
                stream_port: `808${i+1}`,
            }, optionCams[i]));
        }

        confToString(obj) {
            var conf = "";
            Object.keys(obj).sort().forEach((key, i) => {
                var value = obj[key];
                conf += `${key}\t${value}\n`;
                if (motion3_2[key]) {
                    conf += `${motion3_2[key]}\t${value}\n`;
                }
            });
            return conf;
        }

        motion_conf() {
            return this.confToString(this.motion);
        }
        
        camera_conf() {
            return this.camera.map((cam) => {
                return this.confToString(cam);
            });
        }


    } // class RestServer

    module.exports = exports.MotionConf = MotionConf;
})(typeof exports === "object" ? exports : (exports = {}));

(typeof describe === 'function') && describe("RestServer", function() {
    const should = require("should");
    const path = require("path");
    const winston = require("winston");
    const MotionConf = exports.MotionConf || require("../index").MotionConf;
    const appdir = path.join(__dirname, "..");
    const defaultMotion = {
        ffmpeg_cap_new: "on",
        locate: "on",
        locate_motion_mode: "on",
        logfile: path.join(appdir,".motion","motion.log"),
        max_movie_time: "60",
        output_pictures: "best",
        picture_filename: "%v-%Y%m%d%H%M%S-%q",
        picture_type: "jpeg",
        quality: "100",
        snapshot_filename: "%v-%Y%m%d%H%M%S-snapshot",
        stream_localhost: "on",
        stream_maxrate: "10",
        stream_preview_newline: "on",
        stream_quality: "75",
        target_dir: path.join(appdir,".motion"),
        webcontrol_html_output: "on",
        webcontrol_localhost: "on",
    };

    it("constructor() creates configuration object", function() {
        var mc = new MotionConf();
        should.ok(mc.motion);
        mc.motion.should.properties(defaultMotion);

        var customMotion = Object.assign({}, defaultMotion, {
            motion: {
                webcontrol_port: "9090",
            },
        });

        var mc = new MotionConf(customMotion);
        should.ok(mc.motion);
        mc.motion.should.properties(customMotion.motion);
    });
    it("motion_conf() returns text for motion.conf", function() {
        var mc = new MotionConf();
        var conf = mc.motion_conf();
        winston.debug("conf", conf);
        conf.should.match(/\nwebcontrol_port\t8080\n/); // v4
        conf.should.match(/\ncontrol_port\t8080\n/);    // v3.2
    });
    it("camera_conf() returns array of text for cameraX.conf", function() {
        var mc = new MotionConf();
        var conf = mc.camera_conf();
        winston.debug("conf", conf);
        conf.should.instanceOf(Array);
        conf.length.should.equal(1);
        conf[0].should.match(/\nwebcam_port\t8081\n/);  // v4
        conf[0].should.match(/\nstream_port\t8081\n/);  // v3.2

        var mc = new MotionConf({
            camera: [{},{}],
        });
        var conf = mc.camera_conf();
        winston.debug("conf", conf);
        conf.should.instanceOf(Array);
        conf.length.should.equal(2);
        conf[0].should.match(/\nwebcam_port\t8081\n/);  // v4
        conf[0].should.match(/\nstream_port\t8081\n/);  // v3.2
        conf[1].should.match(/\nwebcam_port\t8082\n/);  // v4
        conf[1].should.match(/\nstream_port\t8082\n/);  // v3.2
    });
})
