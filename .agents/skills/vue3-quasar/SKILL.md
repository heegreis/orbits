---
name: vue3-quasar
description: >
  Vue.js 3 + Quasar Framework 模式，搭配 Composition API 與 Pinia 狀態管理。
  觸發條件：開發 Vue.js 3 + Quasar Framework 應用，使用 Composition API、Pinia，或建立 SPA/PWA/行動應用時。
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: '1.0'
---

## 何時使用

- 使用 Quasar Framework 建置 Vue.js 3 應用
- 建立可重用、可擴充、低耦合元件
- 實作 Composition API 模式
- 設定 Pinia 進行可持久化的狀態管理
- 開發 Quasar SPA、PWA 或行動應用
- 使用 Quasar 格線與工具類別套用響應式設計
- 實作可及性最佳做法

## 核心模式

### 🎯 **元件架構**

- **Composition API FIRST** - 除非維護 legacy，否則不要使用 Options API
- **單一職責** - 每個元件只專注一件事
- **Props 介面** - 為 props 明確定義 TypeScript 介面
- **Emits 定義** - 明確宣告 emits
- **Slot 策略** - 使用命名 slot 保持最大彈性

### 🏗️ **專案結構**

```
src/
├── components/           # Reusable UI components
│   ├── base/            # Generic components (BaseButton, BaseInput)
│   ├── layout/          # Layout components (AppHeader, AppSidebar)
│   └── feature/         # Feature-specific components
├── composables/         # Reusable composition functions
├── stores/              # Pinia stores
├── pages/               # Page components (router views)
├── layouts/             # Quasar layouts
└── types/               # TypeScript type definitions
```

### 🔄 **Pinia 狀態管理**

- **每功能一個 Store** - 不同領域使用不同 store
- **Composition Store 風格** - 使用 `setup()` 語法
- **持久化策略** - 使用 pinia-plugin-persistedstate
- **Computed vs Getters** - 派生狀態優先使用 computed

### 📱 **Quasar 最佳實踐**

- **平台偵測** - 使用 `$q.platform` 實作條件邏輯
- **響應式 Grid** - 善用 Quasar 的 12-column grid 系統
- **Icon 策略** - 使用 Quasar icon sets (建議 Material Icons)
- **主題客製化** - 在 quasar.variables.sass 中覆寫 SASS 變數

## Code Examples

### 🧩 **Reusable Component Pattern**

```vue
<template>
  <q-btn
    :class="buttonClasses"
    :disable="loading || disabled"
    :loading="loading"
    @click="handleClick"
  >
    <slot>{{ label }}</slot>
  </q-btn>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

interface Emits {
  click: [event: MouseEvent];
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
});

const emit = defineEmits<Emits>();

const buttonClasses = computed(() => [
  'base-button',
  `base-button--${props.variant}`,
  `base-button--${props.size}`,
]);

const handleClick = (event: MouseEvent) => {
  if (!props.loading && !props.disabled) {
    emit('click', event);
  }
};
</script>

<style scoped>
.base-button {
  transition: all 0.2s ease-in-out;
}

.base-button--primary {
  background-color: var(--q-primary);
  color: white;
}

.base-button--secondary {
  background-color: #e0e0e0;
  color: #2d2d2d;
}

.base-button--sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.base-button--md {
  padding: 0.75rem 1rem;
  font-size: 1rem;
}
</style>
```

### 🗂️ **Pinia Store Pattern**

```typescript
// stores/userStore.ts
export const useUserStore = defineStore(
  'user',
  () => {
    // State
    const user = ref<User | null>(null);
    const preferences = ref<UserPreferences>({
      theme: 'auto',
      language: 'en',
    });

    // Getters (computed)
    const isAuthenticated = computed(() => !!user.value);
    const displayName = computed(() =>
      user.value ? `${user.value.firstName} ${user.value.lastName}` : 'Guest',
    );

    // Actions
    const login = async (credentials: LoginCredentials) => {
      try {
        const response = await authAPI.login(credentials);
        user.value = response.user;
        return { success: true };
      } catch (error) {
        console.error('Login failed:', error);
        return { success: false, error };
      }
    };

    const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
      preferences.value = { ...preferences.value, ...newPreferences };
    };

    return {
      // State
      user: readonly(user),
      preferences,
      // Getters
      isAuthenticated,
      displayName,
      // Actions
      login,
      updatePreferences,
    };
  },
  {
    persist: {
      key: 'user-store',
      paths: ['user', 'preferences'],
    },
  },
);
```

### 🎨 **Composable Pattern**

```typescript
// composables/useApi.ts
export function useApi<T>(url: MaybeRef<string>, options: ApiOptions = {}) {
  const { immediate = true } = options;

  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const execute = async () => {
    try {
      loading.value = true;
      error.value = null;

      const response = await $fetch<T>(unref(url));
      data.value = response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  };

  if (immediate) {
    execute();
  }

  // Watch URL changes
  watch(() => unref(url), execute, { immediate: false });

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    execute,
    refresh: execute,
  };
}
```

### 📱 **Responsive Quasar Layout**

```vue
<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="q-mr-sm"
        />

        <q-toolbar-title class="text-weight-bold">
          {{ $route.meta.title || 'App' }}
        </q-toolbar-title>

        <q-space />

        <!-- Desktop actions -->
        <div v-if="!$q.platform.is.mobile" class="q-gutter-sm">
          <base-button variant="secondary" size="sm"> Settings </base-button>
        </div>

        <!-- Mobile menu -->
        <q-btn v-else flat dense round icon="more_vert" @click="toggleRightDrawer" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered :width="280" class="bg-grey-1">
      <navigation-menu />
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component, route }">
        <transition :name="route.meta.transition || 'fade'" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(false);

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value;
};

const toggleRightDrawer = () => {
  rightDrawerOpen.value = !rightDrawerOpen.value;
};
</script>
```

## 指令

### 🚀 **專案設定**

```bash
# Create new Quasar project with Vue 3 + TypeScript
npm create quasar@latest my-app

# Add Pinia
npm install pinia pinia-plugin-persistedstate

# Development server
npm run dev

# Build for production
npm run build

# PWA build
quasar build -m pwa

# Mobile build (requires Cordova)
quasar build -m cordova -T android
```

### 🔧 **開發工具**

```bash
# Add TypeScript support
npm install -D typescript @types/node

# ESLint + Prettier
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier eslint-config-prettier

# Testing
npm install -D @vue/test-utils vitest jsdom

# Type checking
npm run type-check

# Lint and format
npm run lint
npm run format
```

### 📱 **Quasar CLI 指令**

```bash
# Add platform
quasar mode add pwa
quasar mode add cordova

# Generate component
quasar new component MyComponent
quasar new page MyPage
quasar new layout MyLayout

# Inspect webpack config
quasar inspect --cmd dev
quasar inspect --cmd build
```

## Resources

- **Templates**: See [assets/](assets/) for component templates and store patterns
- **Documentation**: See [references/](references/) for Vue 3 and Quasar specific guides
- **Quasar Documentation**: https://quasar.dev/
- **Vue 3 Composition API**: https://vuejs.org/guide/extras/composition-api-faq.html
- **Pinia Documentation**: https://pinia.vuejs.org/
