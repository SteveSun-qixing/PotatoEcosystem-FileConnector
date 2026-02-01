<script setup lang="ts">
/**
 * 执行视图（占位）
 */
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="execute-view">
    <h2>{{ t('binding.execute') }}</h2>
    <p class="placeholder">执行模块开发中...</p>
  </div>
</template>

<style lang="scss" scoped>
.execute-view {
  h2 {
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-lg);
  }

  .placeholder {
    color: var(--color-text-secondary);
  }
}
</style>
