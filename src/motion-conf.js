(function(exports) {
    const { spawn } = require('child_process');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const fs = require("fs");
    const path = require("path");
    const appdir = process.cwd();
    const motionDir = path.join(appdir, ".motion");
    const Spawner = require('./spawner');
    const props3_2 = require('./motion-props').props3_2;

    class MotionConf {
        constructor(options = {}) {
            this.type = this.constructor.name;
            this.status = null; //indeterminate
            this.name = options.name || "test";
            this.confName = options.confName || `motion-${this.name}.conf`;
            this.confDir = options.confDir || motionDir;
            this.version = options.version || "3.2";
            Object.defineProperty(this, "STATUS_UNKNOWN", { value: "unknown" });
            Object.defineProperty(this, "STATUS_OPEN", { value: "open" });
            Object.defineProperty(this, "STATUS_ERROR", { value: "error" });
            this.status = this.STATUS_UNKNOWN;
            this.motion = Object.assign({
                ffmpeg_cap_new: "on",
                locate_motion_mode: "on",
                logfile: path.join(this.confDir, "motion.log"),
                max_movie_time: "60",
                output_pictures: "best",
                output_debug_pictures: "off",
                picture_type: "jpeg",
                //process_id_file: path.join(this.confDir, `pid-${this.name}.txt`), // not used
                quality: "100",
                stream_localhost: "on",
                stream_maxrate: "10",
                stream_quality: "75",
                target_dir: motionDir,
                webcontrol_html_output: "on",
                webcontrol_localhost: "on",
                webcontrol_port: "8090",
            }, options.motion);
            var nCams = options.cameras && options.cameras.length || 1;
            var optionCams = options.cameras && options.cameras.length && options.cameras || [{}];
            var cameras = new Array(nCams).fill({});
            this.cameras = cameras.map((cam, i) => {
                var cam = `CAM${i+1}`;
                return Object.assign({
                    camera_id: `${i+1}`,
                    input: "-1",
                    movie_filename: `${cam}_%v-%Y%m%d%H%M%S`,
                    picture_filename: `${cam}_%v-%Y%m%d%H%M%S-%q`,
                    snapshot_filename: `${cam}_%v-%Y%m%d%H%M%S-snapshot`,
                    stream_port: `${i+1+Number(this.motion.webcontrol_port)}`,
                    target_dir: path.join(motionDir, `${cam}`),
                    text_left: `${cam}`,
                    videodevice: "/dev/video" + i,

                }, optionCams[i]);
            });
            var that = this;
            this.spawner = new Spawner({
                logName: this.motion.logfile,
                stdOutFilter: function(line) { return that._lineFilter(line) },
            });
        }

        confKeyValueString(key, value) {
            var conf = "";
            if (key === "logfile") {
                return "";
            }
            if (this.version === "3.2") {
                if (key === "input" && value === "-1") {
                    // do nothing (3.2 does not like -1);
                } else if (props3_2[key]) {
                    conf += `${props3_2[key]}\t${value}\n`;
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
            var conf = `# ${now} auto-generated by MotionConf for motion v${this.version}\n`;
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
            var conf = this.confToString(this.motion);
            this.cameras.forEach((key, i) => {
                conf += this.confKeyValueString("camera", this.cameraPath(i, confPath));
            });
            return conf;
        }

        cameraConf() {
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
                        yield fs.writeFile(path.join(that.confDir, that.confName), motion,
                            (err) => err ? async.throw(err) : async.next(true));
                        var cameras = that.cameraConf();
                        for (var i = 0; i < cameras.length; i++) {
                            var campath = path.join(that.confDir, `camera${i+1}.conf`);
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
                        reject(err);
                    }
                }();
                async.next();
            });
        }

        _lineFilter(line) {
            if (line.match(/Problem enabling stream server/)) {
                return Spawner.LINE_REJECT;
            } else if (line.match(/Failed to open video device/)) {
                return Spawner.LINE_REJECT;
            } else if (line.match(/Error selecting input/)) {
                return Spawner.LINE_REJECT;
            } else if (line.match(/Started stream/)) {
                this.status = this.STATUS_OPEN;
                this.statusText = line;
                return Spawner.LINE_RESOLVE;
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
                console.log("verifying pid", pid);
                    process.kill(pid, 0);
                console.log("verifying pid", "active");
                    var err = new Error(`${that.name} camera is already open`);
                    return Promise.reject(err);
                } catch (err) {
                console.log("verifying pid", "inactive");
                    // process not active
                }
            }
            that.status = that.STATUS_UNKNOWN;
            return that.spawner.spawn(cmd);
        }

        stopCamera() {
            if (this.spawner.process == null) {
                return Promise.reject(new Error(`${this.name} camera is not active`));
            }
            return this.spawner.kill();
        }

        bindDevices(devices) {
            var cameras = this.cameras;
            cameras.forEach(camera => (camera.available = false));
            devices.forEach((device, i) => {
                var camera = cameras.filter(camera => (camera.description === device.description))[0];
                camera = camera || cameras.filter(camera => (camera.videodevice === device.device))[0];
                if (camera == null) { // not found
                    var icam = cameras.length;
                    var cam = `CAM${icam+1}`;
                    camera = {
                        camera_id: `${icam+1}`,
                        input: "-1",
                        movie_filename: `${cam}_%v-%Y%m%d%H%M%S`,
                        picture_filename: `${cam}_%v-%Y%m%d%H%M%S-%q`,
                        snapshot_filename: `${cam}_%v-%Y%m%d%H%M%S-snapshot`,
                        stream_port: `${icam+1+Number(this.motion.webcontrol_port)}`,
                        target_dir: path.join(motionDir, `${cam}`),
                        text_left: `${cam}`,
                    }
                    cameras.push(camera);
                }
                camera.videodevice = device.device;
                camera.description = device.description;
                camera.available = true;
            });
        }
       

    } // class MotionConf

    module.exports = exports.MotionConf = MotionConf;
})(typeof exports === "object" ? exports : (exports = {}));
