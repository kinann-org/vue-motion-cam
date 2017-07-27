<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> View/change individual motor drive configuration and position. 
            Position is in drive coordinates (vs. application coordinates).
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <v-card >
        <v-toolbar dark dense card flat class="mb-3 secondary">
            <v-toolbar-title class="subheading">/{{service}}/{{apiName}}</v-toolbar-title>
            <v-spacer/>
            <v-dialog v-model="confirmDelete" v-if="selectedDrive" style="position:relative">
                <v-btn slot="activator" icon light flat class="secondary" >
                    <v-icon>delete</v-icon>
                </v-btn>
                <v-card>
                    <v-card-title>Delete {{selectedDrive.name}} drive permanently?</v-card-title>
                    <v-card-actions>
                        <v-btn dark secondary @click="confirmDelete=false">Cancel</v-btn>
                        <v-spacer/>
                        <v-btn error @click="deleteDrive(selectedDrive)">Delete</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            <v-menu bottom left :offset-y="true">
                <v-btn icon light flat class="secondary" slot="activator">
                    <v-icon>add</v-icon>
                </v-btn>
                <v-list>
                    <v-list-tile v-for="(item,i) in addList" :key="i" @click="addDrive(item)" >
                        <v-list-tile-title>Add {{item}}</v-list-tile-title>
                    </v-list-tile>
                </v-list>
            </v-menu>
        </v-toolbar>
        <v-list>
            <v-list-tile >
                <v-list-tile-content>
                    <v-container fluid class="body-2">
                        <v-layout align-baseline child-flex-m wrap justify-space-between>
                            <v-flex xs1 class="text-xs-center hidden-xs-only">Drive</span></v-flex>
                            <v-flex xs1 class="text-xs-center">Move</v-flex>
                            <v-flex xs2 class="text-xs-center">Position</v-flex>
                            <v-flex xs2 class="text-xs-center hidden-xs-only">Range</v-flex>
                            <v-flex xs2 class="text-xs-center hidden-xs-only">Type</v-flex>
                            <v-flex xs2 class="text-xs-center hidden-xs-only">Steps</v-flex>
                            <v-flex xs1 class="text-xs-center hidden-xs-only">Gear</v-flex>
                            <v-flex xs1 class="text-xs-center">Edit</v-flex>
                        </v-layout>
                    </v-container>
                </v-list-tile-content>
            </v-list-tile>
            <v-list-tile v-for='(drive,i) in drives' :key='i'>
                <v-list-tile-content @click='onClickDrive(drive)'>
                    <v-container fluid :class="selectionClass(drive)">
                        <v-layout align-baseline child-flex-m wrap justify-space-between>
                            <v-flex xs1 class="text-xs-center hidden-xs-only">{{drive.name}}</v-flex>
                            <v-flex xs1 class="text-xs-center">
                                 <v-menu origin="bottom center" transition="v-scale-transition" top >
                                    <v-btn small icon :disabled="rbBusy" slot="activator"
                                        class="primary--text"
                                        ><v-icon>gamepad</v-icon></v-btn>
                                    <v-list dense>
                                        <v-list-tile v-for="pct in [0,25,50,75,100].reverse()" 
                                            @click="positionAxis(i,pct/100)" :key="pct" 
                                            :disabled='rbBusy || drivePos(i) == null'> 
                                            <v-list-tile-title >{{pct}}%</v-list-tile-title> 
                                        </v-list-tile>
                                        <v-list-tile @click="positionAxis(i,'home')" :disabled="rbBusy" > 
                                            <v-list-tile-title >Home</v-list-tile-title> 
                                        </v-list-tile>
                                    </v-list>
                                </v-menu>
                            </v-flex>
                            <v-flex xs2 class="text-xs-center"> {{ drivePos(i) == null ? 'n/a' : drivePos(i) }} </v-flex>
                            <v-flex xs2 class="text-xs-center hidden-xs-only">[{{drive.minPos}}; {{drive.maxPos}}]</v-flex>
                            <v-flex xs2 class="text-xs-center hidden-xs-only">{{drive.type}}</v-flex>
                            <v-flex xs2 class="text-xs-center hidden-xs-only">
                                {{drive.steps}}&#x00d7;{{drive.microsteps}}@{{drive.mstepPulses}}</v-flex>
                            <v-flex xs1 class="text-xs-center hidden-xs-only">
                                {{drive.gearOut}}:{{drive.gearIn}}</v-flex>
                            <v-flex xs1 class="text-xs-center">
                                    <v-btn small icon :disabled="rbBusy" slot="activator"
                                        @click.stop = 'apiEdit("drive"+i)'
                                        class="primary--text"
                                        ><v-icon>edit</v-icon></v-btn>
                            </v-flex>
                        </v-layout>
                    </v-container>
                </v-list-tile-content>
            </v-list-tile>
        </v-list>
        <div v-for="(drive,i) in apiModelCopy.drives" key="i">
            <rb-api-dialog :apiDialog='"drive"+i' :apiSvc='_self'>
                <span slot="title">{{drive.name}} Drive{{i}} Settings</span>
                <rb-dialog-row label="Name">
                    <v-text-field v-model='drive.name' :rules="[apiRules.required]" >
                    </v-text-field>
                </rb-dialog-row>
                <rb-dialog-row label="Homing">
                    <v-select v-bind:items="homeable" v-model="drive.isHomeable"
                              label="Select" single-line ></v-select>
                </rb-dialog-row>
                <rb-dialog-row label="Axis limits">
                    <v-flex xs3 v-tooltip:top='{html:"Axis position when homed"}' slot="v-layout"> 
                        <v-text-field label="Home" v-model="drive.minPos" ></v-text-field> 
                    </v-flex>
                    <v-flex xs3 slot="v-layout"> 
                        <v-text-field label="Maximum" v-model="drive.maxPos" ></v-text-field> 
                    </v-flex>
                </rb-dialog-row>
                <rb-dialog-row label="Stepper motor">
                    <v-flex xs3 v-tooltip:top='{html:"Motor steps per revolution"}' slot="v-layout"> 
                        <v-text-field label="Steps" v-model="drive.steps" ></v-text-field> </v-flex>
                    <v-flex xs3 v-tooltip:top='{html:"Positioning unit"}' slot="v-layout"> 
                        <v-text-field label="Microsteps" v-model="drive.microsteps" ></v-text-field> </v-flex>
                    <v-flex xs3 v-tooltip:top='{html:"Pulses sent for each unit position"}' slot="v-layout"> 
                        <v-text-field label="Pulses" v-model="drive.mstepPulses" ></v-text-field> </v-flex>
                </rb-dialog-row>
                <rb-dialog-row label="Gear ratio">
                    <v-flex xs3 slot="v-layout"> 
                        <v-text-field label="Input" v-model="drive.gearIn" ></v-text-field> </v-flex>
                    <v-flex xs3 slot="v-layout"> 
                        <v-text-field label="Output" v-model="drive.gearOut" ></v-text-field> </v-flex>
                </rb-dialog-row>
                <rb-dialog-row label="Type">
                    <v-select xs6 v-bind:items="driveTypes" v-model="drive.type"
                        label="Select" single-line></v-select>
                </rb-dialog-row>
                <kr-belt-drive v-show='drive.type === "BeltDrive"' :drive="drive"></kr-belt-drive>
                <kr-screw-drive v-show='drive.type === "ScrewDrive"' :drive="drive"></kr-screw-drive>
                <kr-gear-drive v-show='drive.type === "GearDrive"' :drive="drive"></kr-gear-drive>
            </rb-api-dialog>
        </div>

        <v-alert error v-bind:value="error"> {{error}} </v-alert>
    </v-card>
</div>

</template>
<script>

import KrGearDrive from "./KrGearDrive.vue";
import KrBeltDrive from "./KrBeltDrive.vue";
import KrScrewDrive from "./KrScrewDrive.vue";
import rbvue from "rest-bundle/index-vue";
const RbApiDialog = rbvue.components.RbApiDialog;

var positionOpts = [
    { text: 'Home' },
    { text: '25%' },
    { text: '50%' },
    { text: '75%' },
    { text: '100%' },
];

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbApiMixin.createMixin("drives"),
    ],
    props: {
    },
    data: function() {
        return {
            confirmDelete: false,
            apiSvc: this,
            selectedDrive: null,
            addList:[
                "BeltDrive",
                "ScrewDrive",
                "GearDrive",
            ],
            homeable: [{
                text: "Home to limit switch",
                value: true,
            },{
                text: "Use current position as home",
                value: false,
            }],
            driveTypes: [{
                text: "BeltDrive",
                value: "BeltDrive",
            },{
                text: "ScrewDrive",
                value: "ScrewDrive",
            },{
                text: "GearDrive",
                value: "GearDrive",
            }],
            error:"",
            newPos:"",
            positionOpts,
            apiRules: {
                required: (value) => !!value || 'Required',
                gt0: (value) => Number(value) > 0 || 'Positive number',
            },
        }
    },
    methods: {
        onClickDrive(drive) {
            this.selectedDrive = this.selectedDrive === drive ? null : drive;
        },
        positionAxis(axis, goal) {
            console.log("positionAxis", axis, goal);
            if (goal === "home") {
                var url = this.restOrigin() + "/" + this.service + "/home";
                var axes = this.drives.map((d,i) => i===axis ? Number(d.minPos) : null);
            } else {
                var url = this.restOrigin() + "/" + this.service + "/move-to";
                var axes = this.drives.map((d,i) => i===axis ? goal * (d.maxPos - d.minPos) + d.minPos : null);
            }
            this.$http.post(url, axes, {
                headers: {}
            })
        },
        drivePos(iAxis) {
            var position = this.restBundleService().position;
            var axis = position && position.axis;
            return axis && axis[iAxis];
        },
        selectionClass(drive) {
            return drive === this.selectedDrive ? "selectedDrive body-2" : "body-1";
        },
        deleteDrive(drive) {
            var iDrive = this.drives.indexOf(drive);
            if (iDrive != null) {
                console.log("deleteDrive",drive.name, iDrive);
                var apiModelCopy = this.apiEdit();
                this.$delete(apiModelCopy.drives, iDrive);
                this.apiSave();
                this.selectedDrive = null;
                this.confirmDelete = false;
            }
        },
        addDrive(driveType) {
            this.$http.get(this.restOrigin() + "/" + this.service+"/drives/" + driveType)
            .then(res => {
                console.log(res.data);
                console.log("addDrive", driveType)
                var apiModelCopy = this.apiEdit();
                apiModelCopy.drives.push(res.data);
                this.apiSave();
            })
            .catch(err => {
                console.error(err);
            });
        },
    },
    computed: {
        drives() {
            return this.rbModel.apiModel && this.rbModel.apiModel.drives || [];
        },
    },
    components: {
        KrBeltDrive,
        KrGearDrive,
        KrScrewDrive,
        RbApiDialog,
    },
    created() {
        this.restBundleModel();
        this.rbDispatch("apiLoad");
    },
    mounted() {
        console.log("mounted");
    },
}

</script>
<style> 
.selectedDrive {
    border: 2pt solid #fb8c00;
}
</style>
