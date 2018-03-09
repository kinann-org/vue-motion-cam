<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> View webcam
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="nominalH" value="500" slot="prop">Full display image height in pixels</rb-about-item>
    </rb-about>

    <div class="vmc-frame">
        <div class="vmc-container">
            <div class="vmc-commands" xs1 style="border-top-left-radius:7px; border-bottom-left-radius:7px;">
                <v-btn light flat icon @click="toggleCamera()" :disabled="!enableActivation">
                    <v-icon v-show="!enableActivation">lock</v-icon>
                    <v-icon v-show="enableActivation && streaming === false">videocam</v-icon>
                    <v-icon v-show="enableActivation && streaming === true">videocam_off</v-icon>
                    <v-icon v-show="enableActivation && streaming == null" >hourglass_full</v-icon>
                </v-btn>
                <v-btn light flat icon @click="zoomCamera()" >
                    <v-icon >zoom_in</v-icon>
                </v-btn>
            </div>
            <div v-for="(camera,icam) in cameras" :key="icam" class='vmc-feed ' >
                <div class="vmc-feed-actions">
                    <div xs-2 offset-xs2 class="pl-1 pt-2 pb-0">
                        <span :style="streamingLED">&#x25cf;</span>
                        {{camera.camera_name}}
                    </div>
                    <v-menu offset-y>
                      <v-btn small slot=activator icon><v-icon>menu</v-icon></v-btn>
                      <v-list>
                        <v-list-tile @click="editCamera(camera)">
                          <v-list-tile-title>Edit all camera settings</v-list-tile-title>
                        </v-list-tile>
                        <v-list-tile @click="openCameraPage(camera)"
                            :disabled="!streaming"
                            >
                          <v-list-tile-title>Open webcam page</v-list-tile-title>
                        </v-list-tile>
                        <v-list-tile @click="dailyTimelapse(camera,1)">
                          <v-list-tile-title>Timelapse (1-day)</v-list-tile-title>
                        </v-list-tile>
                        <v-list-tile @click="dailyTimelapse(camera,5)">
                          <v-list-tile-title>Timelapse (5-day)</v-list-tile-title>
                        </v-list-tile>
                      </v-list>
                    </v-menu>
                </div>
                <div @click='clickCamera(camera)' 
                    :style='`height:${imgHeight(camera)};width:${imgWidth(camera)}`'
                >
                    <img v-if='streaming && camera.stream_port' :src="cameraUrl(camera)" 
                        :style='`height:${imgHeight(camera)};width:${imgWidth(camera)}`'
                        />
                    <div v-if='!streaming || camera.stream_port==null'
                        :style='`height:${imgHeight(camera)};width:${imgWidth(camera)};`'
                        dark class='vmc-img-placeholder'
                        >
                        <div v-if='!streaming && camera.stream_port'
                            ><v-icon>visibility_off</v-icon></div>
                        <div v-if='camera.stream_port == null'
                            >No device</div>
                        <div style="font-size: xx-small; text-align: center" >{{cameraUrl(camera)}}</div>
                    </div>

                </div>
            </div>
                <rb-api-dialog :apiSvc="apiSvc" v-if="apiModelCopy && apiModelCopy.rbHash ">
                    <div slot="title">All Camera Settings </div>
                    <rb-dialog-row label="General">
                        <v-text-field v-model='apiModelCopy.version' 
                            label="Motion version" disabled class="input-group" />
                        <v-select v-model='apiModelCopy.usage' 
                            :items="usages" item-text='text' item-value='value'
                            label="Usage" class="input-group" ></v-select>
                        <v-select v-model='apiModelCopy.motion.webcontrol_localhost' 
                            :items="localhost_items" item-text='text' item-value='value'
                            label="Web control page" class="input-group" ></v-select>
                        <v-checkbox v-model='apiModelCopy.automation'
                            label="Respond to automation events" />
                    </rb-dialog-row>
                    <rb-dialog-row label="Streaming video">
                        <v-select v-model='apiModelCopy.motion.stream_localhost' 
                            :items="localhost_items" item-text='text' item-value='value'
                            label="Camera streaming" class="input-group" ></v-select>
                        <v-select v-model='apiModelCopy.motion.stream_maxrate' 
                            :items="stream_rate" item-text='text' item-value='value'
                            v-if="apiModelCopy.usage !== 'custom'"
                            label="Streaming rate" class="input-group" ></v-select>
                        <v-text-field v-model='apiModelCopy.motion.stream_maxrate' 
                            v-if="apiModelCopy.usage === 'custom'"
                            label="stream_maxrate" class="input-group" />
                        <v-select v-model='apiModelCopy.motion.stream_quality' 
                            :items="stream_quality" item-text='text' item-value='value'
                            v-if="apiModelCopy.usage !== 'custom'"
                            label="Streaming picture quality" class="input-group" ></v-select>
                        <v-text-field v-model='apiModelCopy.motion.stream_quality' 
                            v-if="apiModelCopy.usage === 'custom'"
                            label="stream_quality" class="input-group" />
                    </rb-dialog-row>
                    <rb-dialog-row label="Timelapse">
                        <v-text-field v-model='apiModelCopy.motion.snapshot_interval' 
                            label="Snapshot/timelapse interval" class="input-group" />
                        <v-text-field v-model='apiModelCopy.timelapse_duration' 
                            label="Timelapse movie duration (seconds)" class="input-group" />
                    </rb-dialog-row>
                    <rb-dialog-row v-for="(camera,icam) in apiModelCopy.cameras" :key="icam" label="Camera">
                        <v-text-field v-model='camera.camera_name' 
                            label="Name" value="Input text" class="input-group" ></v-text-field>
                        <v-select v-model="camera.framesize" 
                            label="Frame Size" class="input-group"
                            :items="framesizes(camera)" 
                        ></v-select>
                    </rb-dialog-row>
                    <!--
                    <rb-tree-view :data="cameraDetails(camera)" rootKey="details" initialDepth="0"/>
                    -->
                </rb-api-dialog>
        </div> <!-- vmc-container -->
    </div> <!-- vmc-frame -->
    <div v-if='about'>
        Send automation event:
        <v-btn default @click="toggleCamera(true, false)">
            On
        </v-btn>
        <v-btn default @click="toggleCamera(false, false)">
            Off
        </v-btn>
    </div>
</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";
const RbApiDialog = rbvue.components.RbApiDialog;

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbApiMixin.createMixin("motion-conf"),
    ],
    props: {
        nominalH: {
            default: 500,
        },
    },
    data: function() {
        return {
            apiEditDialog: false,
            imageScales: [0.25,0.5,1],
            curCamera: null,
            scaleIndex: 0,
            startCount: 0,
            fab: [false, false],
            apiRules: {
                required: (value) => !!value || 'Required',
                gt0: (value) => Number(value) > 0 || 'Positive number',
            },
        }
    },
    methods: {
        framesizes(camera={}) {
            var device = this.devices[camera.videodevice];
            if (device == null) {
                return ["(no device)"];
            }
            var sizes = device.framesizes.reduce((a,fs) => {
                var wh = fs.split("x");
                var width = wh[0];
                var height = wh[1];
                var mp = (width*height/1000000).toFixed(1);
                a.push({
                    text: `${fs} (${mp}MP with aspect ratio:${(width/height).toFixed(1)})`,
                    value: fs,
                });
                return a;
            }, []);
            sizes.sort((a,b) => {
                var awh = a.text.split("x");
                var bwh = b.text.split("x");
                var cmp = awh[0] - bwh[0];
                return cmp ? cmp : awh[1] - bwh[1];
            });
            return sizes;
        },
        cameraDetails(camera) {
            return {
                settings: camera,
                device: this.devices[camera.videodevice],
            }
        },
        editCamera(camera) {
            console.log('edit', camera.camera_name);
            this.curCamera = camera;
            this.rbDispatch("apiLoad").then(r => {
                this.apiEdit();
            });
        },
        zoomCamera() {
            this.scaleIndex = (1+this.scaleIndex) % this.imageScales.length;
        },
        clickFab(camera,i) {
            Vue.set(this, 'fab', this.fab.map((v,iv)=>iv === i ? !v : v));
        },
        clickCamera(camera) {
            console.log("clickCamera", camera.camera_name);
        },
        refreshCameras() {
        },
        imgHeight(camera) {
            var nominalH = this.nominalH || 480;
            return `${this.imageScales[this.scaleIndex] * nominalH}px`;
        },
        imgWidth(camera) {
            var wh = camera.framesize.split('x');
            var nominalH = this.nominalH || 480;
            var nominalW = Math.round(nominalH*wh[0]/wh[1] || 640);
            var w = `${this.imageScales[this.scaleIndex] * nominalW}px`;
            return w;
        },
        cameraUrl(camera) {
            return `http://${location.hostname}:${camera.stream_port}/`;
            //var rnd = Math.random();
            //return `http://${location.hostname}:${camera.stream_port}/?r=${rnd}`;
        },
        toggleCamera(camera_streaming = !this.streaming, manual=true) {
            //this.rbService.streaming = null;
            var data = {
                camera_streaming,
                manual,
            }
            var url = [this.restOrigin(),this.service,"camera", "toggle"].join("/");
            return this.$http.post(url, data).then(r => {
                console.log(`HTTP${r.status}`, JSON.stringify(r.data));
                this.rbService.streaming = camera_streaming;
                return r;
            }).catch(err => {
                this.alertError(`Error toggling cameras: ${err.message}`);
            });
        },
        openCameraPage(camera) {
            window.open(this.cameraUrl(camera), "_blank");
        },
        dailyTimelapse(camera, days) {
            var url = [this.restOrigin(),this.service, "motion", camera.camera_name, `timelapse-${days}.mp4`].join("/");
            var mp4win = window.open(url,"_blank");
        },
        createTimelapse(camera, days) {
            var newurl = [this.restOrigin(),"vue-motion-cam", "ui", "timelapse.html"].join("/");
            var url = [this.restOrigin(), this.service, "timelapse"].join("/");
            var mp4win = window.open(newurl,"_blank");
            var today = new Date();
            today.setHours(0);
            today.setMinutes(0);
            today.setSeconds(0);
            var end_date = new Date(today.getTime() + 24*3600*1000);
            var start_date = new Date(end_date.getTime() - days*24*3600*1000);
            var opts = {
                camera_name: camera.camera_name,
                framesize: camera.framesize,
                start_date,
                end_date,
            };
            return this.$http.post(url, opts).then(r => {
                mp4win.location = this.restOrigin()+r.data.movie_url;
            }).catch(err => {
                mp4win.close();
                this.alertError(`Timelapse error: ${err.message}`);
            });
        },
    },
    computed: {
        streamingLED() {
            if (this.apiModel && this.apiModel.automation) {
                if (this.streaming) {
                    return this.pushCount % 2 ? "color:#00ee00" : "color:#00cc00" ;
                } else {
                    return this.pushCount % 2 ? "color:#aa0000" : "color:#000";
                }
            } else {
                return this.streaming ? "color:#00ee00" : "color:#000";
            }
        },
        usages() {
            return [{
                text: "Streaming camera",
                value: "stream",
            //},{
                //text: "Motion Capture (burglar movies)",
                //value: "motion-capture",
            },{
                text: "Custom (run with scissors) ",
                value: "custom",
            }];
        },
        stream_quality() {
            return [{
                text: "My equipment is the best (100%)",
                value: 100,
            },{
                text: "Fine (90%)",
                value: 90,
            },{
                text: "Medium (50%)",
                value: 50,
            },{
                text: "Coarse (10%)",
                value: 10,
            },{
                text: "Pixel art (1%)",
                value: 1,
            }];
        },
        stream_rate() {
            return [{
                text: "My equipment is the best (100fps)",
                value: 100,
            },{
                text: "HD if I can (60fps)",
                value: 60,
            },{
                text: "Better than TV (30fps)",
                value: 30,
            },{
                text: "Cheap and choppy (10fps)",
                value: 10,
            },{
                text: "Horror movie (1fps)",
                value: 1,
            }];
        },
        localhost_items() {
            return [{
                text: "Restrict to localhost (most secure)",
                value: "on",
            },{
                text: "Allow any host (my network is safe)",
                value: "off",
            }];
        },
        cameraIcon() {
            return this.streaming ? 'videocam_off' : 'videocam';
        },
        enableActivation() {
            return this.rbService && this.rbService.enableActivation;
        },
        streaming() {
            return this.rbService.streaming;
        },
        started() {
            return this.rbResource && this.rbResource.apiModel && this.rbResource.started;
        },
        cameras() {
            return this.rbResource && this.rbResource.apiModel && this.rbResource.apiModel.cameras;
        },
        devices() {
            return this.rbService.devices;
        },
    },
    components: {
        RbApiDialog,
    },
    created() {
        this.$http.get([this.restOrigin(),this.service,"devices"].join("/"));
        this.restBundleResource();
        this.rbDispatch("apiLoad").then(r => {
            // tbd
        });
    },
    mounted() {
    },
}

</script>
<style> 
.vmc-frame {
    display: inline-block;
}
.vmc-container {
    display: flex;
    flex-wrap: wrap;
    background-color: #e8e8e8;
    border-radius: 7px;
}
.vmc-commands {
    display: flex;
    flex-direction: column;
    border-right: 1pt dotted white;
}
.vmc-feed {
    box-sizing: content-box;
    border-right: 7px solid #e8e8e8;
    border-bottom: 7px solid #e8e8e8;
    border-top-right-radius: 7px;
    border-bottom-right-radius: 7px;
}
.vmc-feed-actions {
    position: relative;
    display: flex;
    justify-content: space-between;
}
.vmc-feed-menu {
    background-color: red;
}
.vmc-img-placeholder {
    display: flex;
    background-color: lightgrey;
    flex-flow: column;
    align-items: center;
    justify-content: center;
}
</style>
