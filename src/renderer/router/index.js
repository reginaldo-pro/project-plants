import Vue from 'vue'
import Router from 'vue-router'
import Entries from "../components/Entries";
import Functions from "../components/Functions";
import Relation from "../components/Relation";
import BaseOnline from "../components/BaseOnline";


Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Entries',
      component: Entries
    },
    {
      path: '/:csv/',
      name: 'Functions',
      component: Functions
    },
    {
      path: '/:csv/base/:site_a/:site_b',
      name: 'BaseOnline',
      component: BaseOnline
    },
    {
      path: '/:csv/:site_a/:site_b',
      name: 'Relation',
      component: Relation
    },

    {
      path: '*',
      redirect: '/'
    }
  ]
})
