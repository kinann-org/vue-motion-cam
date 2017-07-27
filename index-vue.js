//import KrDrives from "./src/ui/KrDrives.vue";

var components = {
    //KrDrives,
}
function plugin(Vue, options) {
    Object.keys(components).forEach( key => Vue.component(key, components[key]));
}

export default {
    install: plugin,
    components,
}
