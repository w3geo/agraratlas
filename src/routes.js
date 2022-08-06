import Map from './views/Map.vue';
import About from './views/About.vue';

export default [
  { path: '/:schlagId?', component: Map },
  { path: '/about', component: About },
];
