(function(exports) {
    const { exec, execSync, spawn } = require('child_process');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const fs = require("fs");
    const path = require("path");
    const appdir = process.cwd();
    const motionDir = path.join(appdir, ".motion");
    const MotionConf = require('./motion-conf');

    class Timelapse {
        constructor(opts = {}) {
            Object.assign(this, Timelapse.options(opts));
        }

        static priorDate(date=new Date()) {
            var date = new Date(date);
            date.setDate(date.getDate()-1); // subtract days, not hours because of DST
            date.setHours(23);
            date.setMinutes(59);
            date.setSeconds(59,999);
            return date;
        }

        static createDailyTimelapse(opts={}) {
            var days = opts.days || 7;
            var motionConf = opts.motionConf || new MotionConf();
            var end_date = opts.end_date || Timelapse.priorDate();
            var start_date = new Date(end_date.getTime()-days*24*3600*1000+1);
            var output_file = opts.output_file || `timelapse-${days}.mp4`;
            return new Timelapse(Object.assign({
                end_date,
                start_date,
                output_file,
            }, opts));
        }

        static options(opts={}) {
            const today = new Date();
            const MIN_FRAMERATE = 1;  // slower FPS looks frozen and broken
            const MAX_FRAMERATE = 60; // Call of Duty FPS
            today.setHours(0);
            today.setMinutes(0);
            today.setSeconds(0,0);
            var mc = opts.motionConf || new MotionConf();
            var snapshot_interval = opts.snapshot_interval == null 
                ? mc.motion.snapshot_interval 
                : Number(opts.snapshot_interval);
            var camName = opts.camera_name || mc.cameras[0] && mc.cameras[0].camera_name;
            var cam = mc.cameras.filter(c => c.camera_name == camName)[0] || {};
            var days = opts.days || 1;
            var start_date = opts.start_date && new Date(opts.start_date) || today;
            var end_date = opts.end_date && new Date(opts.end_date) || 
                new Date(start_date.getTime() + days*24*3600*1000);
            var nImages = (end_date - start_date)/1000/snapshot_interval;
            if (opts.framerate) {
                var framerate = opts.framerate;
                var framerate_min = Math.min(framerate, MIN_FRAMERATE);
                var framerate_max = Math.max(framerate, MAX_FRAMERATE);
                var movie_duration = nImages/framerate;
            } else {
                var framerate_min = Number(opts.framerate_min) || MIN_FRAMERATE;
                var framerate_max = Number(opts.framerate_max) || MAX_FRAMERATE;
                var movie_duration = Number(opts.movie_duration) || 10;
                var framerate = nImages / movie_duration ;
                if (framerate < framerate_min) {
                    framerate = framerate_min;
                    movie_duration = nImages/framerate;
                } else if (framerate > framerate_max) {
                    framerate = framerate_max;
                    movie_duration = nImages/framerate;
                }
            }
            var image_dir = opts.image_dir || path.join(mc.confDir, camName);
            var output_file = opts.output_file || 'timelapse.mp4';
            return Object.assign({}, {
                snapshot_interval,
                camera_name: camName,
                image_dir,
                start_date,
                end_date,
                framerate,
                framesize: opts.framesize || cam.framesize || "640x480",
                output: opts.output || path.join(image_dir, output_file),
                movie_duration: movie_duration,
            });
        }

        static snapName(date) {
            var yyyy = date.getFullYear();
            var mo = ("0"+(date.getMonth()+1)).slice(-2);
            var dd = ("0"+(date.getDate())).slice(-2);
            var hh = ("0"+(date.getHours())).slice(-2);
            var mm = ("0"+(date.getMinutes())).slice(-2);
            var ss = ("0"+(date.getSeconds())).slice(-2);
            
            return `${yyyy}${mo}${dd}-${hh}${mm}${ss}-snap.jpg`;
        }
        
        createCommand() {
            var fps = `-f ${this.framerate}`;
            var dir = `-d ${this.image_dir}`;
            var size = `-s ${this.framesize}`;
            var start = Timelapse.snapName(this.start_date);
            var end = Timelapse.snapName(this.end_date);
            var snapmp4 = path.join(__dirname, '..', 'scripts', 'snapmp4.sh');
            var output = `-o ${this.output}`;
            return `${snapmp4} ${fps} ${dir} ${size} ${output} ${start} ${end}`;
                
        }

        createMovie() {
            return new Promise((resolve, reject) => {
                try {
                    var cmd = this.createCommand();
                    winston.info("VmcBundle.createMovie() ", cmd);
                    exec(cmd, {
                        shell: '/bin/bash',
                    },(error, stdout, stderr) => {
                        if (error) {
                            if (error.message.match(/no images found/)) {
                                var output = stdout.trim();
                                winston.info(`Timelapse.createMovie() output:${output}`);
                                resolve(output);
                            } else {
                                winston.error("Timelapse.createMovie()", error.stack);
                                reject(error);
                            }
                        } else {
                            var output = stdout.trim();
                            winston.info(`Timelapse.createMovie() output:${output}`);
                            resolve(output);
                        }
                    });
                } catch (e) {
                    winston.error("Timelapse.createMovie()", e.stack);
                    reject(e);
                }
            });
        }

    } // class Timelapse

    module.exports = exports.Timelapse = Timelapse;
})(typeof exports === "object" ? exports : (exports = {}));

