<script setup lang="ts">
/**
 * 自动匹配视图（占位）
 */
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="auto-match-view">
    <h2>{{ t('auto.title') }}</h2>
    <p class="placeholder">自动识别模块开发中...</p>
  </div>
</template>

<style lang="scss" scoped>
.auto-match-view {
  h2 {
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-lg);
  }

  .placeholder {
    color: var(--color-text-secondary);
  }
}
</style>
