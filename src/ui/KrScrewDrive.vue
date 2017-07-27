
<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display and edit configuration for a lead-screw motor axis.
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="drive" slot="prop">BeltDrive object</rb-about-item>
    </rb-about>
    <v-layout row wrap>
        <v-flex xs3> <v-subheader>Lead screw </v-subheader> </v-flex>
        <v-flex xs3 v-tooltip:top='{html:"Distance (mm) traveled in one revolution"}'> 
            <v-text-field label="Lead" v-model="drive.lead" ></v-text-field> </v-flex>
    </v-layout>
    <v-layout v-if="about" align-baseline row wrap class="grey--text text--darken-1">
        <v-flex xs3> <v-subheader>Properties</v-subheader> </v-flex>
        <v-flex xs6 >{{sampleDrive}}</v-flex>
    </v-layout>
</div>

</template>
<script>

import rbvue from "rest-bundle/index-vue.js";

function defaultDrive() {
    console.log("defaultDrive");
    return {
        name: "SampleScrewDrive",
        lead: 0.8,
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
    mixins: [ rbvue.mixins.RbAboutMixin ],
    props: {
        drive: {
            default: defaultDrive,
        },
    },
    computed: {
        sampleDrive() {
            return defaultDrive();
        },
    },
}

</script><style>

</style>

