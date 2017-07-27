
<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display and edit configuration for a gear-driven motor axis.
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="drive" slot="prop">GearDrive object</rb-about-item>
    </rb-about>
    <v-layout align-baseline row wrap>
        <v-flex xs3> <v-subheader>Gear drive</v-subheader> </v-flex>
        <v-flex xs6> (n/a) </v-flex>
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
        name: "SampleGearDrive",
        gearIn: 1,
        gearOut: 1,
        steps: 200,
        microsteps: 16,
        mstepPulses: 1,
        maxPos: 360,
        minPos: 0,
        isHomeable: false,
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
        }
    },
}

</script><style>

</style>

