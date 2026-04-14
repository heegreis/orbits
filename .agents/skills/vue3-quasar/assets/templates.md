# 元件範本

## 基本元件範本

使用此範本建立可重用元件：

```vue
<template>
  <div :class="componentClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  // 在此定義你的 props
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

interface Emits {
  // 在此定義你的 emits
  update: [value: string];
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
});

const emit = defineEmits<Emits>();

const componentClasses = computed(() => [
  'base-component',
  `base-component--${props.variant}`,
  `base-component--${props.size}`,
]);
</script>

<style scoped>
.base-component {
  /* 在此新增樣式 */
}
</style>
```

## Pinia Store 範本

```typescript
// stores/featureStore.ts
export const useFeatureStore = defineStore(
  'feature',
  () => {
    // State
    const items = ref<Item[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Getters (computed)
    const itemCount = computed(() => items.value.length);
    const hasItems = computed(() => itemCount.value > 0);

    // Actions
    const fetchItems = async () => {
      try {
        loading.value = true;
        error.value = null;

        const response = await api.getItems();
        items.value = response.data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch items';
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const addItem = async (item: CreateItemPayload) => {
      try {
        const response = await api.createItem(item);
        items.value.push(response.data);
        return response.data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to create item';
        throw err;
      }
    };

    return {
      // State
      items: readonly(items),
      loading: readonly(loading),
      error: readonly(error),
      // Getters
      itemCount,
      hasItems,
      // Actions
      fetchItems,
      addItem,
    };
  },
  {
    persist: {
      key: 'feature-store',
      paths: ['items'], // 只持久化指定狀態
    },
  },
);
```

## Composable 範本

```typescript
// composables/useFeature.ts
export function useFeature(options: FeatureOptions = {}) {
  const { autoFetch = true } = options;

  const state = ref<FeatureState>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = async (...args: any[]) => {
    try {
      state.value.loading = true;
      state.value.error = null;

      // 在此加入你的邏輯
      const result = await someAsyncOperation(...args);

      state.value.data = result;
      return result;
    } catch (err) {
      state.value.error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      state.value.loading = false;
    }
  };

  onMounted(() => {
    if (autoFetch) {
      execute();
    }
  });

  return {
    ...toRefs(state),
    execute,
    refresh: execute,
  };
}
```

## Page 元件範本

```vue
<template>
  <q-page class="q-pa-md">
    <!-- 頁面標題 -->
    <div class="row items-center justify-between q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-ma-none">
        {{ pageTitle }}
      </h1>

      <q-btn color="primary" icon="add" label="Add New" @click="handleAdd" />
    </div>

    <!-- 內容區 -->
    <div v-if="loading" class="flex flex-center q-pt-xl">
      <q-spinner-grid size="50px" />
    </div>

    <div v-else-if="error" class="q-pa-md">
      <q-banner type="negative" icon="error">
        {{ error }}
        <template #action>
          <q-btn flat label="Retry" @click="refresh" />
        </template>
      </q-banner>
    </div>

    <div v-else>
      <!-- 在此放置你的內容 -->
    </div>
  </q-page>
</template>

<script setup lang="ts">
// Page metadata
definePageMeta({
  title: 'Page Title',
  requiresAuth: true,
});

// Composables
const { data, loading, error, refresh } = useApi('/api/data');

// State
const pageTitle = 'Your Page Title';

// Methods
const handleAdd = () => {
  // 處理新增邏輯
};
</script>
```
