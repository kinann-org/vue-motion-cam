<template>

<v-card >
    <v-card-title class="primary white--text title" >
        <span class="" >Service Home Page</span>
        <v-spacer></v-spacer>
        <span  class="">/{{serviceFromUrl}}</span>
    </v-card-title>
    <v-card-text v-show="mode==='connect'">
        <v-btn
            light flat
            v-bind:loading="loading" 
            @click="update()" 
            v-bind:disabled="loading"
            >Verify Connections</v-btn>
        <v-card hover v-tooltip:bottom='{html:"<rb-identity/>"}' >
            <rb-identity class="mb-3" :service="serviceFromUrl"/>
        </v-card>
    </v-card-text>
    <v-card-text v-show="mode==='configure'">
        <h6>Configuration</h6>
        <v-card hover v-tooltip:bottom='{html:"<kr-drives/>"}'>
            <kr-drives class="mb-3" :service="serviceFromUrl"/>
        </v-card>
    </v-card-text>
    <v-card-text v-show="mode==='operate'">
        <h6 >Position</h6>
        <v-card hover v-tooltip:bottom='{html:"<kr-position/>"}' >
            <kr-position :service="serviceFromUrl"/>
        </v-card>
    </v-card-text>
    <div style="position:relative">
        <v-bottom-nav style="bottom:60px" class="transparent">
            <v-btn flat light class="teal--text" @click="mode='connect'" :value="mode === 'connect'">
              <span>Connect</span>
              <v-icon>cloud</v-icon>
            </v-btn>
            <v-btn flat light class="teal--text" @click="mode='configure'" :value="mode === 'configure'">
              <span>Configure</span>
              <v-icon>build</v-icon>
            </v-btn>
            <v-btn flat light class="teal--text" @click="mode = 'operate'" :value="mode === 'operate'">
              <span>Operate</span>
              <v-icon>face</v-icon>
            </v-btn>
        </v-bottom-nav>
    </div> 
    <v-card-text height="60px" style="position:relative">
    </v-card-text> 
</v-card>

</template><script>

import rbvue from "rest-bundle/index-vue.js";
import KrPosition from './KrPosition.vue';
import KrDrives  from './KrDrives.vue';

export default {
    name: "service",
    mixins: [ rbvue.mixins.RbApiMixin.createMixin("service") ],
    data: function() {
        return {
            loading: false,
            mode: 'connect',
        }
    }, 
    computed: {
        restBundles() {
            return this.$store.getters.restBundles;
        },
    },
    methods: {
        update() {
            this.loading = true;
            this.$store.dispatch(["restBundle", this.serviceFromUrl, "identity", "apiLoad"].join("/"))
                .then(res => (loading = false))
                .catch(err => (loading = false));
        },
    },
    mounted() {
    },
    components: {
        KrPosition,
        KrDrives,
    },
}

</script>
<style> </style>
