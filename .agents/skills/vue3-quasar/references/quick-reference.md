# Vue 3 + Quasar 快速參考

## 面試成功的重點模式

### 🎯 必備概念

1. **Composition API** - 取代 Options API 的寫法
2. **Reactivity System** - `ref`、`reactive`、`computed`、`watch`
3. **Component Communication** - Props、emits、provide/inject
4. **State Management** - 使用 Pinia store 並搭配持久化
5. **Quasar Components** - 版面佈局系統與響應式設計
6. **Performance** - Lazy loading、code splitting、PWA 功能

### 🚀 常見面試題與解答

**Q: ref 和 reactive 有什麼差別？**

```typescript
// ref - 適用於基礎值或單一值
const count = ref(0);
const user = ref<User | null>(null);

// reactive - 適用於物件（避免用於基礎值）
const state = reactive({
  items: [],
  loading: false,
});
```

**Q: 如何處理元件間溝通？**

```vue
<!-- Parent to Child: Props -->
<ChildComponent :data="parentData" />

<!-- Child to Parent: Emits -->
<ChildComponent @update="handleUpdate" />

<!-- Deep component tree: Provide/Inject -->
provide('theme', themeValue) const theme = inject('theme')
```

**Q: 如何使用 Pinia 持久化狀態？**

```typescript
export const useStore = defineStore(
  'store',
  () => {
    // Store logic
  },
  {
    persist: {
      key: 'my-store',
      paths: ['user', 'preferences'], // 只持久化指定狀態
      storage: localStorage, // 或 sessionStorage
    },
  },
);
```

### 📱 Quasar 必備元件

```vue
<!-- Layout Structure -->
<q-layout view="lHh Lpr lFf">
  <q-header>
    <q-toolbar>
      <q-btn flat round icon="menu" @click="drawer = !drawer" />
      <q-toolbar-title>App</q-toolbar-title>
    </q-toolbar>
  </q-header>

  <q-drawer v-model="drawer" bordered>
    <q-list>
      <q-item clickable>
        <q-item-section>Menu Item</q-item-section>
      </q-item>
    </q-list>
  </q-drawer>

  <q-page-container>
    <router-view />
  </q-page-container>
</q-layout>

<!-- Responsive Grid -->
<div class="row q-gutter-md">
  <div class="col-12 col-md-6 col-lg-4">
    <q-card>
      <q-card-section>Content</q-card-section>
    </q-card>
  </div>
</div>

<!-- Forms -->
<q-form @submit="onSubmit" class="q-gutter-md">
  <q-input
    v-model="form.email"
    type="email"
    label="Email"
    :rules="[val => !!val || 'Required']"
  />
  <q-btn type="submit" color="primary">Submit</q-btn>
</q-form>
```

### 🎨 Quasar 樣式範例

```vue
<template>
  <q-card class="shadow-2 q-pa-md">
    <q-card-section class="bg-primary text-white">
      <h2 class="text-h6 text-weight-bold">Card Title</h2>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.row-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-only {
  display: block;
}

@media (min-width: 768px) {
  .mobile-only {
    display: none;
  }

  .desktop-only {
    display: block;
  }
}

.desktop-only {
  display: none;
}
</style>
```

### 📊 效能最佳實踐

```vue
<script setup lang="ts">
// 1. Lazy loading components
const LazyComponent = defineAsyncComponent(() => import('./components/HeavyComponent.vue'));

// 2. Computed for expensive operations
const expensiveComputation = computed(() => {
  return heavyCalculation(props.data);
});

// 3. Watch with deep option carefully
watch(
  () => props.data,
  (newVal) => {
    // Handle changes
  },
  { deep: true },
); // 謹慎使用

// 4. Memoization for complex data
const memoizedData = computed(() => {
  return useMemo(() => processData(rawData.value), [rawData.value]);
});
</script>
```

### 🔐 Authentication Pattern

```typescript
// stores/authStore.ts
export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null);
    const token = ref<string | null>(null);

    const isAuthenticated = computed(() => !!user.value && !!token.value);

    const login = async (credentials: LoginData) => {
      const response = await authAPI.login(credentials);
      user.value = response.user;
      token.value = response.token;

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
    };

    const logout = () => {
      user.value = null;
      token.value = null;
      delete axios.defaults.headers.common['Authorization'];
      router.push('/login');
    };

    return { user, isAuthenticated, login, logout };
  },
  {
    persist: {
      key: 'auth',
      paths: ['user', 'token'],
    },
  },
);
```

### 📱 PWA 設定

```typescript
// quasar.config.js
module.exports = {
  build: {
    pwa: {
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.mysite\.com\/.*$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
            },
          },
        ],
      },
      manifest: {
        name: 'My App',
        short_name: 'MyApp',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
      },
    },
  },
};
```

### 🧪 測試模式

```typescript
// Component test
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Test' },
    });

    expect(wrapper.find('h1').text()).toBe('Test');
  });

  it('emits event on click', async () => {
    const wrapper = mount(MyComponent);
    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('click')).toBeTruthy();
  });
});

// Store test
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '@/stores/user';

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('handles login correctly', async () => {
    const store = useUserStore();

    await store.login({ email: 'test@test.com', password: 'password' });

    expect(store.isAuthenticated).toBe(true);
    expect(store.user).toBeTruthy();
  });
});
```
