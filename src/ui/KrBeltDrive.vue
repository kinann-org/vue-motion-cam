
<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display and edit configuration for a belt-driven motor axis.
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="drive" slot="prop">BeltDrive object</rb-about-item>
    </rb-about>
    <v-layout align-baseline row wrap>
        <v-flex xs3> <v-subheader>Belt drive</v-subheader> </v-flex>
        <v-flex xs3 v-tooltip:top='{html:"Number of drive pulley teeth"}'> 
            <v-text-field label="Pulley Teeth" v-model="drive.teeth" ></v-text-field> </v-flex>
        <v-flex xs3 v-tooltip:top='{html:"Belt tooth separation in mm"}'> 
            <v-text-field label="Pitch" v-model="drive.teeth" ></v-text-field> </v-flex>
    </v-layout>
    <v-layout v-if="about" align-baseline row wrap class="grey--text text--darken-1">
        <v-flex xs3> <v-subheader>Properties</v-subheader> </v-flex>
        <v-flex xs6 >{{sampleDrive}}</v-flex>
    </v-layout>
</div>

</template>
<script>

import rbvue from 'rest-bundle/index-vue.js';

function defaultDrive() {
    console.log("defaultDrive");
    return {
        name: "SampleBeltDrive",
        teeth: 20,
        gearIn: 1,
        gearOut: 1,
        steps: 200,
        microsteps: 16,
        mstepPulses: 1,
        maxPos: 100,
        minPos: 0,
        isHomeable: true,
    };
}

export default {
    mixins: [ rbvue.mixins.RbAboutMixin],
    props: {
        about: {
            default: false,
        },
        drive: {
            default: defaultDrive,
        },
    },
    data() { return {} },
    computed: {
        sampleDrive() {
            return defaultDrive();
        },
    },
}

</script><style>

</style>

