<script setup lang="ts">
/**
 * 连接器主视图
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();

// 当前模式
type Mode = 'manual' | 'auto' | 'smart' | 'convert';
const currentMode = ref<Mode>('manual');

// 模式配置
const modes = computed(() => [
  {
    id: 'manual' as Mode,
    label: t('mode.manual'),
    icon: '✋',
    description: '手动建立卡片与文件的绑定关系'
  },
  {
    id: 'auto' as Mode,
    label: t('mode.auto'),
    icon: '🔢',
    description: '根据命名规律自动匹配卡片和文件'
  },
  {
    id: 'smart' as Mode,
    label: t('mode.smart'),
    icon: '🤖',
    description: '使用AI分析语义关系进行智能匹配'
  },
  {
    id: 'convert' as Mode,
    label: t('mode.convert'),
    icon: '🔄',
    description: '在空壳和全填充模式之间转换'
  }
]);

// 选择模式
function selectMode(mode: Mode) {
  currentMode.value = mode;
}

// 开始连接
function startConnect() {
  const routes: Record<Mode, string> = {
    manual: '/manual',
    auto: '/auto',
    smart: '/smart',
    convert: '/convert'
  };
  router.push(routes[currentMode.value]);
}
</script>

<template>
  <div class="connector-view">
    <section class="mode-selector">
      <h2>选择连接模式</h2>
      
      <div class="mode-grid">
        <div
          v-for="mode in modes"
          :key="mode.id"
          class="mode-card"
          :class="{ active: currentMode === mode.id }"
          @click="selectMode(mode.id)"
        >
          <div class="mode-icon">{{ mode.icon }}</div>
          <div class="mode-info">
            <h3>{{ mode.label }}</h3>
            <p>{{ mode.description }}</p>
          </div>
          <div v-if="currentMode === mode.id" class="mode-check">✓</div>
        </div>
      </div>
    </section>

    <section class="actions">
      <button class="btn-primary" @click="startConnect">
        开始连接
      </button>
    </section>

    <section class="quick-tips">
      <h3>使用提示</h3>
      <ul>
        <li><strong>手动连接</strong>：适合文件数量少、命名无规律的情况</li>
        <li><strong>自动识别</strong>：适合文件命名有数字或关键词规律的情况</li>
        <li><strong>智能识别</strong>：适合命名复杂、跨语言的情况</li>
        <li><strong>模式转换</strong>：用于在空壳和全填充模式之间批量转换</li>
      </ul>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.connector-view {
  max-width: 800px;
  margin: 0 auto;
}

.mode-selector {
  margin-bottom: var(--spacing-xl);

  h2 {
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-lg);
    font-weight: 600;
  }
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.mode-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-bg-hover);
  }

  &.active {
    border-color: var(--color-primary);
    background: var(--color-primary-bg);
  }
}

.mode-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.mode-info {
  flex: 1;

  h3 {
    margin-bottom: var(--spacing-xs);
    font-size: var(--font-size-md);
    font-weight: 600;
  }

  p {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.4;
  }
}

.mode-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: bold;
}

.actions {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.btn-primary {
  padding: 12px 48px;
  font-size: var(--font-size-md);
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);

  &:hover {
    background: var(--color-primary-hover);
  }

  &:active {
    background: var(--color-primary-active);
  }
}

.quick-tips {
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);

  h3 {
    margin-bottom: var(--spacing-sm);
    font-size: var(--font-size-md);
    font-weight: 600;
  }

  ul {
    padding-left: var(--spacing-md);

    li {
      margin-bottom: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      list-style: disc;

      strong {
        color: var(--color-text-primary);
      }
    }
  }
}
</style>
