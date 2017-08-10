<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> View webcam
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <v-card flat hover>
        <v-card-text>
            <div class="vmc-frame">
                <div class="vmc-container">
                    <div class="vmc-commands" xs1 style="border-top-left-radius:7px; border-bottom-left-radius:7px;">
                        <v-btn light flat icon @click="toggleCamera()" >
                            <v-icon v-show="streaming === false" >videocam</v-icon>
                            <v-icon v-show="streaming === true" 
                                style="border: 1pt solid red; border-radius: 7px;"
                                >videocam_off</v-icon>
                            <v-icon v-show="streaming == null" >hourglass_full</v-icon>
                        </v-btn>
                        <v-btn light flat icon @click="zoomCamera()" >
                            <v-icon >zoom_in</v-icon>
                        </v-btn>
                    </div>
                    <div v-for="(camera,i) in cameras" :key="i" class='vmc-feed ' >
                        <div class="vmc-feed-actions">
                                <div xs-2 offset-xs2 class="pl-1 pt-1 pb-0">{{camera.name}}</div>
                                <div @click.stop='clickFab(camera,i)' >
                                    <v-icon v-if="!fab[i]">menu</v-icon>
                                    <v-icon v-if="fab[i]">close</v-icon>
                                </div>
                                <v-speed-dial v-model="fab[i]" direction='bottom' 
                                    absolute
                                    transition="slide-y-reverse-transition"
                                    style='z-index:999; right: 12px; top: 25px;'
                                >
                                    <v-btn fab dark small class="green" @click='editCamera(camera)' >
                                        <v-icon>edit</v-icon>
                                    </v-btn>
                                    <v-btn fab dark small class="indigo" >
                                        <v-icon>add</v-icon>
                                    </v-btn>
                                    <v-btn fab dark small class="red" >
                                        <v-icon>delete</v-icon>
                                    </v-btn>
                                </v-speed-dial>
                        </div>
                        <div @click='clickCamera(camera)' 
                            :style='`height:${imgHeight};width:${imgWidth}`'
                        >
                            <img v-if='streaming && camera.stream_port' :src="camera.url" 
                                :style='`height:${imgHeight};width:${imgWidth}`'
                                />
                            <div v-if='!streaming || camera.stream_port==null'
                                :style='`height:${imgHeight};width:${imgWidth};`'
                                dark class='vmc-img-placeholder'
                                >
                                <div v-if='!streaming && camera.stream_port'
                                    ><v-icon>visibility_off</v-icon></div>
                                <div v-if='camera.stream_port == null'
                                    >No device</div>
                            </div>

                        </div>
                    </div>
                </div> <!-- vmc-container -->
            <!--
            <rb-tree-view :data="rbService" :rootKey="service"/>
            {{cameras}}
            -->
            </div> <!-- vmc-frame -->
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
            fab: [false, false],
            apiRules: {
                required: (value) => !!value || 'Required',
                gt0: (value) => Number(value) > 0 || 'Positive number',
            },
        }
    },
    methods: {
        editCamera(camera) {
            console.log('edit', camera.name);
        },
        zoomCamera() {
            this.scaleIndex = (1+this.scaleIndex) % this.imageScales.length;
        },
        clickFab(camera,i) {
            Vue.set(this, 'fab', this.fab.map((v,iv)=>iv === i ? !v : v));
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
    align-items: center;
    justify-content: center;
}
</style>
