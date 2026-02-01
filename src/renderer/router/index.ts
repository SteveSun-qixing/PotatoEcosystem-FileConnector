/**
 * Vue Router配置
 * @module renderer/router
 */

import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@renderer/views/ConnectorView.vue')
  },
  {
    path: '/manual',
    name: 'Manual',
    component: () => import('@renderer/views/ManualView.vue')
  },
  {
    path: '/auto',
    name: 'AutoMatch',
    component: () => import('@renderer/views/AutoMatchView.vue')
  },
  {
    path: '/smart',
    name: 'SmartMatch',
    component: () => import('@renderer/views/SmartMatchView.vue')
  },
  {
    path: '/preview',
    name: 'Preview',
    component: () => import('@renderer/views/PreviewView.vue')
  },
  {
    path: '/execute',
    name: 'Execute',
    component: () => import('@renderer/views/ExecuteView.vue')
  },
  {
    path: '/convert',
    name: 'Convert',
    component: () => import('@renderer/views/ConvertView.vue')
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
