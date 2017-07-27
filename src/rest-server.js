(function(exports) {
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const path = require("path");
    const rb = require("rest-bundle");

    class RestServer extends rb.RestBundle {
        constructor(name = "test", options = {}) {
            super(name, Object.assign({
                srcPkg,
            }, options));

            Object.defineProperty(this, "handlers", {
                value: super.handlers.concat([
                    //this.resourceMethod("get", "drives", this.getDrives),
                    //this.resourceMethod("put", "drives", this.putDrives),
                ]),
            });
            this.apiFile = `${srcPkg.name}.${name}.drives`;
            this.options = Object.assign({}, options);
        }

        ////updateDrives(drives) {
            //var json = drives.map(d => JSON.stringify(d));
            //var newDrives = json.map(j => StepperDrive.fromJSON(j));
            //this.df = new DriveFrame(newDrives, this.options);
        //}

        //get drives() {
            //return this.df.drives;
        //}

        //loadApiModel(filePath) {
            //return new Promise((resolve, reject) => {
                //super.loadApiModel(filePath)
                    //.then(model => {
                        //if (model) {
                            //this.updateDrives(model.drives);
                            //resolve(model);
                        //} else if (filePath === this.apiFile) {
                            //resolve({
                                //drives: this.drives,
                            //});
                        //} else {
                            //reject(new Error("unknown api model:" + filePath));
                        //}
                    //})
                    //.catch(err => reject(err));
            //});
        //}

        //saveApiModel(model, filePath) {
            //return new Promise((resolve, reject) => {
                //super.saveApiModel(model, filePath)
                    //.then(res => {
                        //if (filePath === this.apiFile) {
                            //this.updateDrives(model.drives);
                        //}
                        //resolve(res);
                    //})
                    //.catch(e => reject(e));
            //});
        //}

        //getDrives(req, res, next) {
            //return this.getApiModel(req, res, next, this.apiFile);
        //}

        //putDrives(req, res, next) {
            //return this.putApiModel(req, res, next, this.apiFile);
        //}


    } //// class RestServer

    module.exports = exports.RestServer = RestServer;
})(typeof exports === "object" ? exports : (exports = {}));
