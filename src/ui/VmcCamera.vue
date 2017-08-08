<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> View webcam
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <v-card hover>
        <v-toolbar dense flat class="grey lighten-3">
            <v-toolbar-title> vmc-camera </v-toolbar-title>
            <v-spacer/>
            <v-btn flat @click="startCamera()" >Start</v-btn>
            <v-btn flat @click="stopCamera()">stop</v-btn>
        </v-toolbar>
        <v-card-text>
            <v-layout>
                <v-flex v-for="(camera,i) in cameras" :key="i">
                    <div>{{camera.name}}:{{camera.stream_port}}@{{camera.videodevice}}</div>
                    <img v-if='rbService.streaming && camera.stream_port' :src="camera.url" height="120px"/>
                    <v-toolbar flat dense v-if='!rbService.streaming && camera.stream_port'
                        class='grey lighten-1 text-xs-center'>
                        <v-toolbar-title class="text-xs-center white--text"><v-icon>visibility_off</v-icon></v-toolbar-title>
                    </v-toolbar>
                    <v-toolbar flat dense v-if='camera.stream_port == null' 
                        class='grey lighten-1 text-xs-center'>
                        <v-toolbar-title class="text-xs-center white--text">No device</v-toolbar-title>
                    </v-toolbar>
                </v-flex>
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
            startCount: 0,
            apiRules: {
                required: (value) => !!value || 'Required',
                gt0: (value) => Number(value) > 0 || 'Positive number',
            },
        }
    },
    methods: {
        refreshCameras() {
            var rnd = Math.random();
            this.cameras.forEach(camera => {
                Vue.set(camera, 'url', `http://localhost:${camera.stream_port}/?r=${rnd}`);
            });
        },
        startCamera() {
            var url = [this.restOrigin(),this.service,"camera", "start"].join("/");
            Vue.set(this.rbResource, 'httpErr', null);
            this.$http.post(url, "nodata").then(r => {
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
            this.$http.post(url, "nodata").then(r => {
                console.log(`HTTP${r.status}`, JSON.stringify(r.data));
                return r;
            }).catch(err => {
                Vue.set(this.rbResource, 'httpErr', err);
            });
        },
    },
    computed: {
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
.selectedDrive {
    border: 2pt solid #fb8c00;
}
</style>
