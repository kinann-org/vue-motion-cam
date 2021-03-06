(function(exports) {
    const { spawnSync } = require('child_process');
    const winston = require("winston");

    function jsonValue(value) {
        var numVal = isNaN(value) ? null : (Number(value)+'');
        return numVal === value ? Number(value) : value;
    }
    class V4L2Ctl {
        constructor(options = {}) {
        }

        describeDevice(filepath='/dev/video0') {
            const that = this;
            return new Promise((resolve, reject) => {
                // TODO use spawn() for performance
                var result = spawnSync(`v4l2-ctl`, [`-d`, filepath, '--all', '--list-framesizes=MJPG']);
                var stdout = result.stdout.toString().split('\n');
                var device = {
                    filepath,
                    framesizes: [],
                };
                var framesizes = {};
                var prevkey = "";
                stdout.forEach((line, i) => {
                    let icolon = line.indexOf(':');
                    if (line.match(/^\t\/dev/)) {
                        device.signature = stdout[i-1];
                        device.filepath = line.substr(1);
                    } else if (line.match(/Size: Discrete/)) {
                        var tokens = line.split(' ');
                        var framesize = tokens[tokens.length-1];
                        if (!framesizes.hasOwnProperty(framesize)) {
                            device.framesizes.push(framesize);
                            framesizes[framesize] = true;
                        }
                    } else if (line.match(/:..*/)) {
                        var key = line.substr(0, icolon).trim().replace(/ /g,'_');
                        key = key.replace(/\(.*\)$/,'');
                        key = key.toLowerCase();
                        var value = line.substr(icolon+1).trim();
                        if (value[0] === "'") {
                            value = value.substr(1, value.length-2);
                        }
                        if (key === 'default') {
                            key = `${prevkey}_${key}`;
                        }
                        if (key === 'width/height') {
                            var wh = value.split('/');
                            device.width = jsonValue(wh[0]);
                            device.height = jsonValue(wh[1]);
                        } else if (key === 'frames_per_second') {
                            device[key] = jsonValue(value.split(' ')[0]);
                        } else if (key === 'ioctl') {
                            // ignore VIDIOC_ENUM_FRAMESIZES
                        } else if (value.match(/, /)) {
                            var vals = value.split(', ');
                            var obj = device[key] = {};
                            vals.forEach((v,i) => {
                                var tokens = v.split(' ');
                                obj[tokens[0].toLowerCase()] = jsonValue(tokens[1]);
                            });
                        } else if (value.match(/=/)) {
                            var vals = value.split(' ');
                            var obj = device[key] = {};
                            vals.forEach((v,i) => {
                                var tokens = v.split('=');
                                obj[tokens[0].toLowerCase()] = jsonValue(tokens[1]);
                            });
                        } else {
                            device[key] = jsonValue(value);
                        }
                        prevkey = key;
                    }
                });

                resolve(device);
            });
        }

        listDevices(options={}) {
            const that = this;
            return new Promise((resolve, reject) => {
                var async = function* () {
                    try {
                        var result = spawnSync(`v4l2-ctl`, [`--list-devices`]); // TODO use spawn() for performance
                        var stdout = result.stdout.toString().split('\n');
                        var device = {filepath: 'undefined'};
                        var devices = stdout.reduce((acc, line, i) => {
                            if (line.match(/^\t\/dev/)) {
                                device = {
                                    signature: stdout[i-1],
                                    filepath: line.substr(1),
                                };
                                acc.push(device);
                            }
                            return acc;
                        }, []);
                        devices.sort((a,b) => a.filepath > b.filepath);
                        for (var idev = 0; idev < devices.length; idev++) {
                            var device = devices[idev];
                            var detail = yield that.describeDevice(device.filepath)
                                .then(r=>async.next(r)).catch(e=>async.throw(e));
                            Object.assign(device, detail);
                            winston.info(`V4L2Ctl.listDevices() ${device.signature} ${device.filepath}`);
                        }

                        var oDevices = devices.reduce((a,d) => ((a[d.filepath]=d),a), {});
                        resolve(oDevices);
                    } catch (err) {
                        winston.error(err.stack);
                        reject(err);
                    }
                }();
                async.next();
            });
        }

    } // class Spawner

    module.exports = exports.V4L2Ctl = V4L2Ctl;

})(typeof exports === "object" ? exports : (exports = {}));
