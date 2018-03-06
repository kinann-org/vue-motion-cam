(typeof describe === 'function') && describe("Timelapse", function() {
    const should = require("should");
    const fs = require('fs');
    const winston = require('winston');
    const appdir = process.cwd();
    const path = require("path");
    const motionDir = path.join(appdir, ".motion");
    const {
        Timelapse,
        MotionConf,
    } = require('../index');
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0,0);
    var mcDefault = new MotionConf();

    it("options() returns default ctor options", function() {
        var camera_name = mcDefault.cameras[0].camera_name;
        should.deepEqual(Timelapse.options(), {
            snapshot_interval: mcDefault.motion.snapshot_interval,
            camera_name,
            image_dir: path.join(motionDir, "CAM1"),
            start_date: today,
            end_date: new Date(today.getTime()+24*3600*1000),
            framerate: 1.6,
            framesize: "640x480",
            movie_duration: 15,
            output: path.join(motionDir, camera_name, 'timelapse.mp4'),
        });
    });
    it("options({days:...}) determines default end_date", function() {
        var days = 10;
        should(Timelapse.options({
            days,
        })).properties({
            start_date: today,
            end_date: new Date(today.getTime() + days*24*3600*1000),
        });
    });
    it("options() adjusts framerate based on movie_duration", function() {
        should(Timelapse.options({
            movie_duration: 5,
        })).properties({
            framerate: 4.8,
            movie_duration: 5,
        });
        should(Timelapse.options({
            movie_duration: 1,
        })).properties({
            framerate: 24,
            movie_duration: 1,
        });

        // movie_duration can be affected by framerate_min
        should(Timelapse.options({
            movie_duration: 100, 
        })).properties({
            framerate: 1,
            movie_duration: 24,
        });
        should(Timelapse.options({
            movie_duration: 100,
            framerate_min: 0.1,
        })).properties({
            framerate: 0.24,
            movie_duration: 100,
        });

        // movie_duration can be affected by framerate_max
        should(Timelapse.options({
            snapshot_interval: 60,
            movie_duration: 10,
        })).properties({
            framerate: 60,
            movie_duration: 24,
        });
        should(Timelapse.options({
            framerate_max: 150,
            snapshot_interval: 60,
            movie_duration: 10,
        })).properties({
            framerate: 144,
            movie_duration: 10,
        });
    });
    it("options() has motionConf option", function() {
        var framesize = "848x640";
        var camera_name = "laptopcam";
        var motionConf = new MotionConf({
            motion: {
                snapshot_interval: 60,
            },
            cameras: [{
                camera_name,
                framesize,
            }],
        });
        should.deepEqual(Timelapse.options({
            motionConf,
        }), {
            camera_name,
            end_date: new Date(today.getTime()+24*3600*1000),
            framerate: 60,
            framesize,
            image_dir: path.join(motionDir, camera_name),
            movie_duration: 24,
            output: path.join(motionDir, camera_name, 'timelapse.mp4'),
            snapshot_interval: 60,
            start_date: today,

        });
    });
    it("createDailyTimelapse(opts) creates Timelapse for past week", function() {
        var timelapse = Timelapse.createDailyTimelapse({});
        should(timelapse).instanceof(Timelapse);
        var date = new Date(new Date().getTime()-24*3600*1000);
        date.setHours(23);
        date.setMinutes(59);
        date.setSeconds(59,999);
        should.deepEqual(timelapse.end_date, date);
        should.deepEqual(timelapse.start_date, new Date(date.getTime()-7*24*3600*1000+1));
    });
    it("createCommand() builds timelapse command line", function() {
        var snapshot_interval = 10;
        var start_date = new Date(2018,1,12,11,45,10);
        var end_date = new Date(2018,1,12,11,46,10);
        var output = '/tmp/timelapse.mp4';
        var image_dir = path.join(__dirname, '..', 'test', 'CAM1');
        var framerate = 3;
        var timelapse = new Timelapse({
            start_date,
            end_date,
            snapshot_interval,
            image_dir,
            framesize: "848x640",
            framerate, // overrides movie_duration
            output,
        });
        should(timelapse).properties({
            framerate,
            movie_duration: 2,
        });
        var cmd = timelapse.createCommand();
        var snapmp4 = path.join(__dirname, '..', 'scripts', 'snapmp4.sh');
        should(cmd).match(new RegExp(snapmp4, "m"));
        should(cmd).match(new RegExp(`-d ${image_dir}`, "m"));
        should(cmd).match(new RegExp(`-f ${framerate}`, "m"));
        should(cmd).match(new RegExp(`-s 848x640`, "m"));
        should(cmd).match(new RegExp(`-o ${output}`, "m"));
        should(cmd).match(/20180212-114510-snap.jpg 20180212-114610-snap.jpg/m);
    });
    it("createMovie() returns filepath of created timelapse", function(done) {
        var async = function*() {
            try {
                var start_date = new Date(2018,1,12,11,45,10);
                var end_date = new Date(2018,1,12,11,46,10);
                var output = '/tmp/timelapse.mp4';
                var image_dir = path.join(__dirname, '..', 'test', 'CAM1');
                var timelapse = new Timelapse({
                    snapshot_interval: 10,
                    start_date,
                    end_date,
                    framesize: "848x640",
                    framerate: 3,
                    image_dir,
                    output,
                });
                if (fs.existsSync(output)) {
                    fs.unlinkSync(output);
                }
                winston.info(timelapse.createCommand());
                var result = yield timelapse.createMovie().then(r=>async.next(r)).catch(e => {
                    winston.error(e.stack);
                    done(e);
                    async.throw(e);
                });
                should(result).equal(output);
                should(fs.statSync(result)).properties({
                    size: 56992,
                });
                done();
            } catch(e) {
                winston.error(e.stack);
                done(e);
            }
        }();
        async.next();
        
    });
})
