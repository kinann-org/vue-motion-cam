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
</v-card>

</template><script>

import rbvue from "rest-bundle/index-vue.js";

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
    },
}

</script>
<style> </style>
