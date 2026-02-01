/**
 * Vue渲染进程入口
 * @module renderer/main
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n from '@/i18n';

// 全局样式
import './styles/global.scss';

// 创建Vue应用
const app = createApp(App);

// 使用插件
app.use(createPinia());
app.use(router);
app.use(i18n);

// 挂载应用
app.mount('#app');
