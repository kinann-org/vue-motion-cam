import VmcCamera from "./src/ui/VmcCamera.vue";

var components = {
    VmcCamera,
}
function plugin(Vue, options) {
    Object.keys(components).forEach( key => Vue.component(key, components[key]));
}

export default {
    install: plugin,
    components,
}
