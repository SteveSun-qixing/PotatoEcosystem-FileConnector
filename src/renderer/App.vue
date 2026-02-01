<script setup lang="ts">
/**
 * 根组件
 */
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const appReady = ref(false);

onMounted(() => {
  // 应用初始化
  console.log('File Connector initialized');
  appReady.value = true;
});
</script>

<template>
  <div id="file-connector-app" :class="{ ready: appReady }">
    <header class="app-header">
      <h1>{{ t('connector.title') }}</h1>
      <p class="subtitle">{{ t('connector.description') }}</p>
    </header>
    
    <main class="app-main">
      <RouterView />
    </main>
    
    <footer class="app-footer">
      <span>Chips File Connector v1.0.0</span>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
#file-connector-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  opacity: 0;
  transition: opacity 0.3s ease;

  &.ready {
    opacity: 1;
  }
}

.app-header {
  padding: 16px 24px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .subtitle {
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--color-text-secondary);
  }
}

.app-main {
  flex: 1;
  overflow: auto;
  padding: 24px;
  background: var(--color-bg-primary);
}

.app-footer {
  padding: 8px 24px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  text-align: center;
}
</style>
