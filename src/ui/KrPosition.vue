<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display current position in selected coordinate system(s):
            <ul>
                <li><b>Stepper</b> coordinates are real numbers that are rounded to integers for digital positioning.</li>
                <li><b>Axis</b> coordinates are measured in "human useful" units such as millimetres or degrees.</li>
                <li><b>World</b> coordinates are effector application coordinates.</li>
            </ul>
            Note that each Stepper position normally corresponds to exactly one Axis position, 
            but the relationship between Axis and World
            coordinates defined by robot kinematics may be complex. For example, in SCARA robots, two
            different Axis positions may place the effector at the same World position.
        </p>
        <p> When powered up, robot position is initially unkonwn. Unknwon positions are represented by "?".
            Homing an axis establishes its initial position.
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="model" value="identity" slot="prop">RestBundle state name</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>
    <v-layout class="grey lighten-3 grey--text">
          <v-layout flex wrap justify-start>
              <v-chip v-for="item in posItems" :key="item.text" 
                  v-show="item.display"
                  @input="item.display=!item.display"
                  @click.stop
                  light
                  class="chip--select-multi pl-4 grey lighten-3"
                  >
                  <template >{{item.text}}: {{positionStr(item.basis)}}</template>
              </v-chip>
          </v-layout>
          <v-menu top right class="mr-2">
              <v-btn icon="icon" slot="activator" dark>
                  <v-icon>menu</v-icon>
              </v-btn>
              <v-list>
                  <v-list-tile v-for="item in posItems" :key="item.text"
                      @click="item.display=!item.display">
                      <v-list-tile-action>
                          <v-icon v-if="item.display">check</v-icon>
                      </v-list-tile-action>
                      <v-list-tile-title>{{ item.text }}</v-list-tile-title>
                  </v-list-tile>
              </v-list>
          </v-menu>
    </v-layout>
</div>

</template>
<script>

import rbvue from "rest-bundle/index-vue";
import Vue from "vue";

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbApiMixin.createMixin("position"),
    ],
    methods: {
        positionStr(basis) {
            var basisPos = this.position[basis];
            if (basisPos == null) {
                return "(unavailable)";
            }
            return basisPos.reduce( (acc,p) => (acc = acc + (p == null ? "?" : p) + "\u00a0\u00a0"), "")
                || "(no axes)";
        },
    },
    props: {
        model: {
            default: "position",
        }
    },
    created() {
        this.restBundleModel({
            motor: [],
            axis: [],
            world: [],
        });
    },
    data: function() {
        return {
            showDetail: false, 
            posItems: [{
                text:"Stepper",
                basis:"motor",
                display: true,
            },{
                text:"Axis",
                basis:"axis",
                display: true,
            },{
                text:"World",
                basis:"world",
                display: true,
            }],
        }
    },
    created( ){
        this.rbDispatch("apiLoad");
    },
    computed: {
        position() {
            return this.rbModel;
        },
    },
}

</script><style>


</style>

