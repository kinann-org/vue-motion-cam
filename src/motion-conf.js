(function(exports) {
    const { execSync, spawn } = require('child_process');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const fs = require("fs");
    const path = require("path");
    const appdir = process.cwd();
    const motionDir = path.join(appdir, ".motion");
    const Spawner = require('./spawner');
    const { exec } = require('child_process');
    const { 
        props3_2_12,
        props3_2, 
        props_vmc ,
    } = require('./motion-props');
    const timelapse_periods = {
        hourly: 3600,
        daily: 86400,
        'weekly-sunday': 7*86400,
        'weekly-monday': 7*86400,
        'monthly': 31*86400,
        'manual': 86400,
    };

    class MotionConf {
        constructor(options = {}) {
            this.type = this.constructor.name;
            this.usage = options.usage || 'stream';
            this.status = null; //indeterminate
            this.name = options.name || "test";
            this.confName = options.confName || `motion-${this.name}.conf`;
            this.confDir = options.confDir || motionDir;
            this.version = options.version || "3.2.12";
            winston.info(`MotionConf ${this.version}`);
            Object.defineProperty(this, "STATUS_UNKNOWN", { value: "unknown" });
            Object.defineProperty(this, "STATUS_OPEN", { value: "open" });
            Object.defineProperty(this, "STATUS_ERROR", { value: "error" });
            this.status = this.STATUS_UNKNOWN;
            this.motion = Object.assign({
                ffmpeg_output_movies: "on",
                locate_motion_mode: "on",
                logfile: path.join(this.confDir, "motion.log"),
                max_movie_time: 60,
                output_pictures: "best",
                output_debug_pictures: "off",
                picture_type: "jpeg",
                //process_id_file: path.join(this.confDir, `pid-${this.name}.txt`), // not used
                quality: 100,
                stream_localhost: "on",
                stream_maxrate: 10,
                stream_quality: 50,
                //target_dir: motionDir,
                webcontrol_html_output: "on",
                webcontrol_localhost: "on",
                webcontrol_port: 8090,
            }, options.motion);
            var nCams = options.cameras && options.cameras.length || 1;
            var optionCams = options.cameras && options.cameras.length && options.cameras || [{}];
            var cameras = new Array(nCams).fill({});
            this.cameras = cameras.map((cam, i) => {
                return Object.assign(this.defaultCamera(i+1), optionCams[i]);
            });
            var that = this;
            this.spawner = new Spawner({
                logName: this.motion.logfile,
                stdOutFilter: function(line) { return that._lineFilter(line) },
            });
        }

        static installedVersion() {
            return new Promise((resolve, reject) => {
                var cmd = 'bash -c "motion -h 2>&1 | sed -n 1p | sed \\"s/[^0-9]*\\([0-9.]*\\).*/\\1/\\""';
                exec(cmd, null, (error, stdout, stderr) => {
                    if (error) {
                        winston.warn(error);
                        reject(error);
                    } else {
                        var result = stdout.trim();
                        winston.info(`MotionConf.installedVersion() => ${result}`);
                        resolve(result);
                    }
                });
            });
        }

        confKeyValueString(key, value) {
            var conf = "";
            if (key === "logfile") {
                return "";
            }
            if (props_vmc[key]) {
                conf += `${props_vmc[key]}\t${value}\n`;
            } else if (this.version < "3.2.12") { // 3.2
                if (key === "input" && value === -1) {
                    // do nothing (3.2 does not like -1);
                } else if (key === "picture_type") {
                    var ppm = value==='ppm' ? 'on' : 'off';
                    conf += `ppm\t${ppm}\n`;
                } else if (props3_2[key]) {
                    conf += `${props3_2[key]}\t${value}\n`;
                } else {
                    conf += `${key}\t${value}\n`;
                }
            } else if (this.version <= "3.2.12") { // 3.2.12
                if (key === "input" && value === -1) {
                    // do nothing (3.2 does not like -1);
                } else if (key === "picture_type") {
                    var ppm = value==='ppm' ? 'on' : 'off';
                    conf += `picture_type\t${ppm}\n`;
                } else if (props3_2_12[key]) {
                    conf += `${props3_2_12[key]}\t${value}\n`;
                } else {
                    conf += `${key}\t${value}\n`;
                }
            } else {
                conf += `${key}\t${value}\n`;
            }
            return conf;
        }

        confToString(obj) {
            var now = new Date().toLocaleString();
            var conf = `# ${now} auto-generated by MotionConf\n`
            conf += `# version\t${this.version}\n`;
            conf += `# usage\t${this.usage}\n`;
            Object.keys(obj).sort().forEach((key, i) => {
                var value = obj[key];
                conf += this.confKeyValueString(key, value);
            });
            return conf;
        }

        cameraPath(iCam, confPath = motionDir) {
            return path.join(confPath, `camera${iCam+1}.conf`);
        }

        motionConf(confPath = motionDir) {
            if (this.usage === 'timelapse') {
                this.motion.timelapse_mode = this.motion.timelapse_mode || 'daily';
                this.motion.max_movie_time = timelapse_periods[this.motion.timelapse_mode];
                this.motion.output_pictures = 'off';
                this.motion.ffmpeg_bps = '9999999';
                this.motion.ffmpeg_timelapse = timelapse_periods[this.motion.timelapse_mode]/86400*30,
                this.motion.ffmpeg_output_movies = 'off';
                this.motion.locate_motion_mode = 'off';
            } else if (this.usage === 'motion-capture') {
                this.motion.max_movie_time = 3600;
                this.motion.output_pictures = 'on';
                this.motion.ffmpeg_bps = 400000;
                this.motion.ffmpeg_timelapse = 0;
                this.motion.ffmpeg_output_movies = 'on';
                this.motion.locate_motion_mode = 'on';
            } else if (this.usage === 'stream') {
                this.motion.max_movie_time = 3600;
                this.motion.output_pictures = 'off';
                this.motion.ffmpeg_timelapse = 0;
                this.motion.ffmpeg_output_movies = 'off';
                this.motion.locate_motion_mode = 'off';
            }
            var conf = this.confToString(this.motion);
            this.cameras.forEach((c, i) => {
                if (c.stream_port == null) {
                    conf += '# UNAVAILABLE ';
                }
                conf += this.confKeyValueString("camera", this.cameraPath(i, confPath));
            });
            return conf;
        }

        cameraConf() {
            this.cameras.forEach((cam) => {
                if (cam.framesize) {
                    var wh = cam.framesize.split("x");
                    cam.width = wh[0];
                    cam.height = wh[1];
                }
            });
            return this.cameras.map((cam) => {
                return this.confToString(cam);
            });
        }

        writeConf() {
            var that = this;
            return new Promise((resolve, reject) => {
                var async = function*() {
                    try {
                        if (!fs.existsSync(that.confDir)) {
                            yield fs.mkdir(that.confDir, (err) => err ? async.throw(err) : async.next(err));
                        }
                        var motion = that.motionConf(that.confDir);
                        var confpath = path.join(that.confDir, that.confName);
                        winston.info(`MotionConf.writeConf() ${confpath}`);
                        yield fs.writeFile(confpath, motion,
                            (err) => err ? async.throw(err) : async.next(true));
                        var cameras = that.cameraConf();
                        for (var i = 0; i < cameras.length; i++) {
                            var campath = path.join(that.confDir, `camera${i+1}.conf`);
                            winston.info(`MotionConf.writeConf() ${campath}`);
                            yield fs.writeFile(campath, cameras[i],
                                (err) => err ? async.throw(err) : async.next(true));
                        };
                        resolve(true);
                    } catch (err) {
                        reject(err);
                    }
                }();
                async.next();
            });
        }

        toJSON() {
            return {
                type: this.type,
                usage: this.usage,
                motion: this.motion,
                cameras: this.cameras,
                version: this.version,
            }
        }

        shellCommands() {
            var confPath = path.join(this.confDir, this.confName);
            return {
                startCamera: ['motion','-c', `${confPath}`],
            }
        }

        startCamera() {
            var that = this;
            return new Promise((resolve, reject) => {
                var async = function* () {
                    try {
                        yield that.writeConf().then(r=>async.next(r)).catch(e=>async.throw(e));
                        var r = yield that._spawnMotion().then(r=>async.next(r)).catch(e=>async.throw(e));
                        resolve(r);
                    } catch (err) {
                        winston.err(`MotionConf.startCamera()`, err.stack);
                        reject(err);
                    }
                }();
                async.next();
            });
        }

        _lineFilter(line) {
            if (line.match(/Problem enabling stream server/)) {
                this.nErrors++;
                return Spawner.LINE_REJECT;
            } else if (line.match(/Failed to open video device/)) {
                this.nErrors++;
                return Spawner.LINE_REJECT;
            } else if (line.match(/Error selecting input/)) {
                return Spawner.LINE_REJECT;
            } else if (line.match(/Started stream/)) {
                this.status = this.STATUS_OPEN;
                this.statusText = line;
                this.nStreams++;
                var nExpected = this.cameras.reduce((a,c) => (c.stream_port ? a+1:a), 0);
                winston.info(`${this.nStreams} of ${nExpected} camera streams started: ${line}`);
                return nExpected === this.nStreams ? Spawner.LINE_RESOLVE : Spawner.LINE_INFO;
            } else if (line.match(/Waiting for threads to finish/)) {
                this.status = this.STATUS_OPEN;
                this.statusText = line;
                this.nStreams++;
                var nExpected = this.cameras.reduce((a,c) => (c.stream_port ? a+1:a), 0);
                winston.info(`${this.nStreams} of ${nExpected} camera streams started: ${line}`);
                return nExpected === this.nStreams ? Spawner.LINE_RESOLVE : Spawner.LINE_INFO;
            } else {
                return Spawner.LINE_INFO;
            }
        }

        _spawnMotion() {
            const cmd = this.shellCommands().startCamera;
            const that = this;
            if (that.process && that.status === that.STATUS_OPEN) {
                const pid = that.process.pid;
                try {
                    process.kill(pid, 0);
                    var err = new Error(`${that.name} camera is already open`);
                    return Promise.reject(err);
                } catch (err) {
                    winston.info("No existing camera service: starting camera service...");
                    // process not active
                }
            }
            that.status = that.STATUS_UNKNOWN;
            that.nStreams = 0;
            winston.info("MotionConf._spqnMotion", cmd);
            return that.spawner.spawn(cmd);
        }

        stopCamera() {
            if (this.spawner.process == null) {
                return new Promise((resolve, reject) => {
                    try {
                        execSync('pkill -f "^motion -c"');
                        resolve({
                            status: "camera streaming is shutting down",
                        });
                    } catch (err) {
                        winston.info(err.stack);
                        resolve({
                            status: "camera streaming is off",
                        });
                    }
                });
            }

            return this.spawner.kill();
        }

        defaultCamera(id) {
            var cam = `CAM${id}`;
            return {
                camera_id: id,
                input: -1,
                movie_filename: `${cam}_%v-%Y%m%d%H%M%S`,
                picture_filename: `${cam}_%v-%Y%m%d%H%M%S-%q`,
                snapshot_filename: `${cam}_%v-%Y%m%d%H%M%S-snapshot`,
                stream_port: id + this.motion.webcontrol_port,
                target_dir: path.join(motionDir, `${cam}`),
                text_left: `${cam}`,
                camera_name: `${cam}`,
                videodevice: `/dev/video${id-1}`,
                framesize: "640x480",
            }
        }

        bindDevices(devices) {
            var cameras = this.cameras;
            cameras.forEach((camera,i) => {
                camera.stream_port = null;
                camera.camera_id = i+1;
            });
            var devpaths = Object.keys(devices);
            devpaths.forEach((dp, i) => {
                var device = devices[dp];
                var camera = cameras.filter(c => (c.signature === device.signature))[0];
                camera = camera || cameras.filter(c => 
                    c.signature == null && c.videodevice === device.filepath)[0];
                if (camera == null) { // not found
                    camera = this.defaultCamera(cameras.length+1);
                    cameras.push(camera);
                }
                var width = camera.framesize.split("x")[0];
                var height = camera.framesize.split("x")[1];
                var s = null;
                if (s = device.framesizes.find(s => camera.framesize === s)) {
                    winston.info(`MotionConf.bindDevices() ${camera.camera_name} framesize ok:${s}`);
                } else if (s = device.framesizes.find(s => 0<s.indexOf('x'+height))) {
                    winston.info(`MotionConf.bindDevices() ${camera.camera_name} setting framesize from height: ${s}`);
                    camera.framesize = s;
                } else {
                    camera.framesize = device.framesizes[0];
                    winston.info(`MotionConf.bindDevices() ${camera.camera_name} framesize is now: ${camera.framesize}`);
                }
                console.log("camera.framesize", camera.framesize);
                camera.videodevice = device.filepath;
                camera.signature = device.signature;
                camera.stream_port = camera.camera_id + this.motion.webcontrol_port;
                camera.camera_name = camera.camera_name || `CAM${camera.camera_id}`;
            });
        }

    } // class MotionConf

    module.exports = exports.MotionConf = MotionConf;
})(typeof exports === "object" ? exports : (exports = {}));
