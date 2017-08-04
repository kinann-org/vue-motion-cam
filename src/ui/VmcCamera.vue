<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> View webcam
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <v-card hover>
        <v-toolbar flat class="grey lighten-3">
            <v-toolbar-title> vmc-camera </v-toolbar-title>
            <v-spacer/>
            <v-btn flat @click="startCamera()" >Start</v-btn>
            <v-btn flat @click="stopCamera()">stop</v-btn>
        </v-toolbar>
        <v-card-text>
            <img src="http://localhost:8081/" />
        </v-card-text>
        <v-card-text>
            <rb-tree-view :data="restBundleModel()"/>
        </v-card-text>
    </v-card>

</div>

</template>
<script>

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
            apiRules: {
                required: (value) => !!value || 'Required',
                gt0: (value) => Number(value) > 0 || 'Positive number',
            },
        }
    },
    methods: {
        startCamera() {
            var url = [this.restOrigin(),this.service,"camera", "start"].join("/");
            this.$http.post(url, "nodata");
        },
        stopCamera() {
            var url = [this.restOrigin(),this.service,"camera", "stop"].join("/");
            this.$http.post(url, "nodata");
        },
    },
    computed: {
    },
    components: {
        RbApiDialog,
    },
    created() {
        this.restBundleModel();
        this.rbDispatch("apiLoad");
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
