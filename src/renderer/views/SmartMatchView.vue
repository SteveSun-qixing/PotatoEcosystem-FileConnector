<script setup lang="ts">
/**
 * 智能匹配视图（占位）
 */
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="smart-match-view">
    <h2>{{ t('smart.title') }}</h2>
    <p class="placeholder">智能识别模块开发中...</p>
  </div>
</template>

<style lang="scss" scoped>
.smart-match-view {
  h2 {
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-lg);
  }

  .placeholder {
    color: var(--color-text-secondary);
  }
}
</style>
