<script setup lang="ts">
/**
 * 手动连接视图（占位）
 */
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="manual-view">
    <h2>{{ t('manual.title') }}</h2>
    <p class="placeholder">手动连接模块开发中...</p>
  </div>
</template>

<style lang="scss" scoped>
.manual-view {
  h2 {
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-lg);
  }

  .placeholder {
    color: var(--color-text-secondary);
  }
}
</style>
