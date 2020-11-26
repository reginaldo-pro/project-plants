import Vue from 'vue'
import Router from 'vue-router'
import Index from "../components/Index";
import Entries from "../components/Entries";
import Functions from "../components/Functions";
import BaseOnline from "../components/BaseOnline";
import Relation from "../components/Relation";
import ocorrencias from "../components/Ocorrencias";


Vue.use(Router)
//
// export default new Router({
//   routes: [
//     {
//       path: '/',
//       name: 'Index',
//       component: Index
//     },
//     {
//       path: '*',
//       redirect: '/'
//     }
//   ]
// })

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
      path: '/:csv/ocorrencias',
      name: 'Ocorrencias',
      component: ocorrencias
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
