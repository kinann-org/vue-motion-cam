<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> View webcam
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <v-card flat hover>
    {{fab}}
        <v-card-text>
            <v-layout wrap row>
                <v-flex class='grey' xs1 style="border-top-left-radius:7px; border-bottom-left-radius:7px;">
                    <v-btn dark flat icon @click="toggleCamera()" >
                        <v-icon v-show="streaming === false">videocam</v-icon>
                        <v-icon v-show="streaming === true" class="white--text"
                            style="border: 1pt solid red; border-radius: 7px;"
                            >videocam_off</v-icon>
                        <v-icon v-show="streaming == null" >hourglass_full</v-icon>
                    </v-btn>
                    <v-btn dark flat icon @click="zoomCamera()" >
                        <v-icon >zoom_in</v-icon>
                    </v-btn>
                </v-flex>
                <div v-for="(camera,i) in cameras" :key="i" class='vmc-feed ' >
                    <div style='position:relative;' >
                        <v-layout row >
                            <v-flex xs-2 offset-xs2 class="white--text pt-1 pb-1">{{camera.name}}</v-flex>
                            <v-speed-dial v-model="fab" direction='bottom' 
                                absolute
                                transition="slide-y-reverse-transition"
                                style='z-index:999; left: -13px; top: -8px;'
                            >
                                <v-btn v-model='fab' slot='activator' 
                                    small flat dark fab
                                    @click.stop='clickFab(camera)'
                                    class='grey'
                                >
                                    <v-icon>menu</v-icon>
                                    <v-icon>close</v-icon>
                                </v-btn>
                              <v-btn fab dark small class="green" >
                                <v-icon>edit</v-icon>
                              </v-btn>
                              <v-btn fab dark small class="indigo" >
                                <v-icon>add</v-icon>
                              </v-btn>
                              <v-btn fab dark small class="red" >
                                <v-icon>delete</v-icon>
                              </v-btn>
                            </v-speed-dial>
                        </v-layout>
                    </div>
                    <v-layout @click='clickCamera(camera)' >
                        <div class="green" >
                            <img v-if='streaming && camera.stream_port' :src="camera.url" 
                                :style='`height:${imgHeight};width:${imgWidth}`'
                                @click='clickCamera(camera)' />
                            <div v-if='!streaming || camera.stream_port==null'
                                :style='`height:${imgHeight};width:${imgWidth}`'
                                dark class='title grey lighten-1 text-xs-center pt-4'>
                                <span v-if='!streaming && camera.stream_port'
                                    class="text-xs-center white--text"><v-icon>visibility_off</v-icon></span>
                                <span v-if='camera.stream_port == null'
                                    class="text-xs-center white--text">No device</span>
                            </div>

                        </div>
                    </v-layout>
                </div>
                <div class='grey' style="border-top-right-radius:7px; border-bottom-right-radius:7px; width:7px">
                &nbsp;
                </div>
            </v-layout>
            <!--
            <rb-tree-view :data="rbService" :rootKey="service"/>
            {{cameras}}
            -->
        </v-card-text>
        <v-system-bar v-if='httpErr' 
            v-tooltip:above='{html:`${httpErr.config.url} \u2794 HTTP${httpErr.response.status} ${httpErr.response.statusText}`}'
            class='error' dark>
            <span >{{httpErr.response.data.error || httpErr.response.statusText}}</span>
        </v-system-bar>
    </v-card>

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
    },
    data: function() {
        return {
            apiSvc: this,
            imageScales: [0.25,0.5,1],
            scaleIndex: 0,
            startCount: 0,
            fab: false,
            apiRules: {
                required: (value) => !!value || 'Required',
                gt0: (value) => Number(value) > 0 || 'Positive number',
            },
        }
    },
    methods: {
        zoomCamera() {
            this.scaleIndex = (1+this.scaleIndex) % this.imageScales.length;
        },
        clickFab(camera) {
            Vue.set(this, 'fab', !this.fab);
            console.log('clickFab', this.fab);
        },
        clickCamera(camera) {
            console.log("clickCamera", camera.name);
        },
        refreshCameras() {
            var rnd = Math.random();
            this.cameras.forEach(camera => {
                Vue.set(camera, 'url', `http://localhost:${camera.stream_port}/?r=${rnd}`);
            });
        },
        toggleCamera() {
            var newStream = this.streaming ? false : true;
            this.rbService.streaming = null;
            if (newStream) {
                var promise = this.startCamera();
            } else {
                var promise = this.stopCamera();
            }
            promise.then(r => (this.rbService.streaming = newStream));
        },
        startCamera() {
            var url = [this.restOrigin(),this.service,"camera", "start"].join("/");
            Vue.set(this.rbResource, 'httpErr', null);
            return this.$http.post(url, "nodata").then(r => {
                console.log(`HTTP${r.status}`, JSON.stringify(r.data));
                this.refreshCameras();
                return r;
            }).catch(err => {
                Vue.set(this.rbResource, 'httpErr', err);
            });
        },
        stopCamera() {
            var url = [this.restOrigin(),this.service,"camera", "stop"].join("/");
            Vue.set(this.rbResource, 'httpErr', null);
            return this.$http.post(url, "nodata").then(r => {
                console.log(`HTTP${r.status}`, JSON.stringify(r.data));
                return r;
            }).catch(err => {
                Vue.set(this.rbResource, 'httpErr', err);
            });
        },
    },
    computed: {
        imgHeight() {
            return `${this.imageScales[this.scaleIndex] * 480}px`;
        },
        imgWidth() {
            return `${this.imageScales[this.scaleIndex] * 640}px`;
        },
        cameraIcon() {
            return this.streaming ? 'videocam_off' : 'videocam';
        },
        streaming() {
            return this.rbService.streaming;
        },
        httpErr() {
            return this.rbResource.httpErr;
        },
        started() {
            return this.rbResource && this.rbResource.apiModel && this.rbResource.started;
        },
        cameras() {
            return this.rbResource && this.rbResource.apiModel && this.rbResource.apiModel.cameras;
        }
    },
    components: {
        RbApiDialog,
    },
    created() {
        this.$http.get([this.restOrigin(),this.service,"devices"].join("/"));
        this.restBundleResource();
        this.rbDispatch("apiLoad").then(r => {
            this.refreshCameras();
        });
    },
    mounted() {
    },
}

</script>
<style> 
.vmc-feed {
    border: 2pt solid red;
}
</style>
