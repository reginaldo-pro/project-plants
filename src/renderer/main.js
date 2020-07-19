import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import moment from 'moment'

Vue.prototype.moment = moment
moment.locale('pt-BR');

import VueFab from 'vue-float-action-button'
import VueGraph from 'vue-graph/src/main'

const bcd = require('mdn-browser-compat-data');
bcd.css.properties.background;

Vue.use(VueFab, {
    iconType: 'MaterialDesign'
})
Vue.use(BootstrapVue)
Vue.config.productionTip = false

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false
const CancelToken = axios.CancelToken;
const source = CancelToken.source();
//
Vue.use(VueGraph)
/* eslint-disable no-new */
new Vue({
    components: {App},
    router,
    template: '<App/>'
}).$mount('#app')
