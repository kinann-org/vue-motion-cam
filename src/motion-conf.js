(function(exports) {
    const { spawn } = require('child_process');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const fs = require("fs");
    const path = require("path");
    const appdir = process.cwd();
    const motionDir = path.join(appdir, ".motion");
    const props3_2 = {
        // See http://htmlpreview.github.io/?https://github.com/Motion-Project/motion/blob/master/motion_guide.html
        area_detect: "area_detect",
        auto_brightness: "auto_brightness",
        brightness: "brightness",
        camera: "thread",
        camera_dir: "# camera_dir",
        camera_id: "# camera_id",
        camera_name: "# camera_name:",
        contrast: "contrast",
        daemon: "daemon",
        database_busy_timeout: "# database_busy_timeout:",
        database_dbname: "mysql_db",
        database_dbname: "pgsql_db",
        database_host: "mysql_host",
        database_host: "pgsql_host",
        database_password: "mysql_password",
        database_password: "pgsql_password",
        database_port: "pgsql_port",
        database_type: "# database_type:",
        database_user: "mysql_user",
        database_user: "pgsql_user",
        despeckle_filter: "despeckle",
        emulate_motion: "output_all",
        event_gap: "gap",
        exif_text: "# exif_text:",
        extpipe: "# extpipe:",
        ffmpeg_bps: "ffmpeg_bps",
        ffmpeg_duplicate_frames: "# ffmpeg_duplicate_frames:",
        ffmpeg_output_debug_movies: "ffmpeg_cap_motion",
        ffmpeg_output_movies: "ffmpeg_cap_new",
        ffmpeg_timelapse: "ffmpeg_timelapse",
        ffmpeg_timelapse_mode: "ffmpeg_timelapse_mode",
        ffmpeg_variable_bitrate: "ffmpeg_variable_bitrate",
        ffmpeg_video_codec: "ffmpeg_video_codec",
        flip_axis: "flip_axis",
        framerate: "framerate",
        frequency: "frequency",
        height: "height",
        hue: "hue",
        input: "input",
        ipv6_enabled: "# ipv6_enabled:",
        lightswitch: "lightswitch",
        locate_motion_mode: "locate",
        locate_motion_style: "# locate_motion_style:",
        log_level: "# log_level:",
        log_type: "# log_type:",
        logfile: "# logfile:",
        mask_file: "mask_file",
        mask_privacy: "# mask_privacy:",
        max_movie_time: "max_mpeg_time",
        minimum_frame_time: "minimum_frame_time",
        minimum_motion_frames: "minimum_motion_frames",
        mmalcam_control_params: "# mmalcam_control_params:",
        mmalcam_name: "# mmalcam_name:",
        motion_video_pipe: "motion_video_pipe",
        movie_filename: "movie_filename",
        netcam_keepalive: "netcam_keepalive",
        netcam_proxy: "netcam_proxy",
        netcam_tolerant_check: "netcam_tolerant_check",
        netcam_url: "netcam_url",
        netcam_userpass: "netcam_userpass",
        noise_level: "noise_level",
        noise_tune: "noise_tune",
        norm: "norm",
        on_area_detected: "on_area_detected",
        on_camera_lost: "on_camera_lost",
        on_camera_found: "on_camera_found",
        on_event_end: "on_event_end",
        on_event_start: "on_event_start",
        on_motion_detected: "on_motion_detected",
        on_movie_end: "on_movie_end",
        on_movie_start: "on_movie_start",
        on_picture_save: "on_picture_save",
        output_debug_pictures: "output_normal",
        output_pictures: "output_motion",
        picture_filename: "jpeg_filename",
        picture_type: "ppm",
        post_capture: "post_capture",
        power_line_frequency: "# power_line_frequency:",
        pre_capture: "pre_capture",
        process_id_file: "process_id_file",
        quality: "quality",
        quiet: "quiet",
        rotate: "rotate",
        roundrobin_frames: "roundrobin_frames",
        roundrobin_skip: "roundrobin_skip",
        rtsp_uses_tcp: "# rtsp_uses_tcp:",
        saturation: "saturation",
        setup_mode: "setup_mode",
        smart_mask_speed: "smart_mask_speed",
        snapshot_filename: "snapshot_filename",
        snapshot_interval: "snapshot_interval",
        sql_log_movie: "sql_log_mpeg",
        sql_log_picture: "sql_log_image",
        sql_log_snapshot: "sql_log_snapshot",
        sql_log_timelapse: "sql_log_timelapse",
        sql_query: "sql_query",
        sql_query_start: "sql_query_start",
        stream_auth_method: "# stream_auth_method:",
        stream_authentication: "# stream_authentication:",
        stream_limit: "webcam_limit",
        stream_localhost: "webcam_localhost",
        stream_maxrate: "webcam_maxrate",
        stream_motion: "webcam_motion",
        stream_port: "webcam_port",
        stream_preview_newline: "# stream_preview_newline:",
        stream_preview_scale: "# stream_preview_scale:",
        stream_quality: "webcam_quality",
        switchfilter: "switchfilter",
        target_dir: "target_dir",
        text_changes: "text_changes",
        text_double: "text_double",
        text_event: "text_event",
        text_left: "text_left",
        text_right: "text_right",
        threshold: "threshold",
        threshold_tune: "threshold_tune",
        timelapse_filename: "timelapse_filename",
        track_auto: "track_auto",
        track_iomojo_id: "track_iomojo_id",
        track_maxx: "track_maxx",
        track_maxy: "track_maxy",
        track_motorx: "track_motorx",
        track_motory: "track_motory",
        track_move_wait: "track_move_wait",
        track_port: "track_port",
        track_speed: "track_speed",
        track_step_angle_x: "track_step_angle_x",
        track_step_angle_y: "track_step_angle_y",
        track_stepsize: "track_stepsize",
        track_type: "track_type",
        tunerdevice: "tunerdevice",
        use_extpipe: "# use_extpipe:",
        v4l2_palette: "v4l2_palette",
        video_pipe: "video_pipe",
        videodevice: "videodevice",
        webcontrol_authentication: "control_authentication",
        webcontrol_html_output: "control_html_output",
        webcontrol_localhost: "control_localhost",
        webcontrol_port: "control_port",
        width: "width",
    }

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
                logfile: path.join(motionDir, "motion.log"),
                max_movie_time: "60",
                output_pictures: "best",
                output_debug_pictures: "off",
                picture_type: "jpeg",
                process_id_file: path.join(motionDir, `pid-${this.name}.txt`),
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
                    stream_port: `808${i+1}`,
                    target_dir: path.join(motionDir, `${cam}`),
                    text_left: `${cam}`,
                    videodevice: "/dev/video" + i,

                }, optionCams[i]);
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
            return this;
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

        _spawnMotion() {
            const cmd = this.shellCommands().startCamera;
            const that = this;
            const logfile = fs.openSync(that.motion.logfile, 'w');
            if (that.status === that.STATUS_OPEN) {
                return Promise.reject(new Error(`${that.name} camera is already open`));
            }
            return new Promise((resolve, reject) => {
                function rejectWith(err) {
                    var err = err instanceof Error ? err : new Error(err);
                    winston.error(err.stack);
                    that.statusText = err.message;
                    that.status = that.STATUS_ERROR;
                    reject(err);
                    if (that.motion_process) {
                        try {
                            const pid = that.motion_process.pid;
                            fs.writeSync(logfile, `[vmc] startCamera failed--killing pid:${pid};\n`);
                            process.kill(pid);;
                            that.motion_process = null;
                        } catch (err) {
                            winston.error(err.stack);
                        }
                    }
                }
                try {
                    that.status = that.STATUS_UNKNOWN;
                    fs.writeSync(logfile, `[vmc] startCamera ${new Date().toLocaleString()}\n`);
                    var mp = that.motion_process = spawn(cmd[0], cmd.slice(1));
                    mp.stdout.on('data', (chunk) => fs.writeSync(logfile, chunk));
                    mp.stderr.on('data', (chunk) => {
                        var str = chunk.toString();
                        fs.writeSync(logfile, str);
                        str.split("\n").forEach(line => {
                            if (line.match(/Problem enabling stream server/)) {
                                rejectWith(line);
                            } else if (line.match(/Failed to open video device/)) {
                                rejectWith(line);
                            } else if (line.match(/Error selecting input/)) {
                                rejectWith(line);
                            } else if (line.match(/Started stream/)) {
                                that.status = that.STATUS_OPEN;
                                that.statusText = line;
                                resolve(mp);
                            } else {
                                // ignore other lines
                            }
                        });
                    });
                    mp.on('exit', (code,signal) => {
                        winston.info("motion exit:", code ? "OK" : `ERR:${code}`, signal);
                    });
                    mp.on('close', (code,signal) => {
                        winston.info("motion closed:", code ? "OK" : `ERR:${code}`, signal);
                    });
                    mp.on('error', err => {
                        winston.error("motion error:", err.message, err.stack);
                    });
                } catch (err) {
                    rejectWith(err);
                }
            });
        }

        stopCamera() {
            if (this.motion_process == null) {
                return Promise.reject(new Error(`${this.name} camera is not active`));
            }
            var pid = this.motion_process.pid;
            process.kill(pid);
            this.motion_process = null;
            return Promise.resolve("killed");
        }
       

    } // class MotionConf

    module.exports = exports.MotionConf = MotionConf;
})(typeof exports === "object" ? exports : (exports = {}));
