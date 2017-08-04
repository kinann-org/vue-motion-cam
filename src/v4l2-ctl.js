(function(exports) {
    const { spawnSync } = require('child_process');
    const winston = require("winston");

    class V4L2Ctl {
        constructor(options = {}) {
        }

        listDevices() {
            const that = this;
            return new Promise((resolve, reject) => {
                var result = spawnSync(`v4l2-ctl`, [`--list-devices`]); // TODO use spawn() for performance
                var stdout = result.stdout.toString().split('\n');
                var devices = stdout.reduce((acc, line, i) => {
                    if (line.match(/^\t/)) {
                        acc.push({
                            description: stdout[i-1],
                            device: line.substr(1),
                        });
                    }
                    return acc;
                }, []);
                devices.sort((a,b) => a.device > b.device);

                resolve(devices);
            });
        }

    } // class Spawner

    module.exports = exports.V4L2Ctl = V4L2Ctl;

})(typeof exports === "object" ? exports : (exports = {}));
