<template>
  <q-card class="shadow-2 rounded-borders" flat>
    <q-card-section>
      <div class="text-h6 q-mb-sm">ZeroClaw Pairing</div>
      <div class="text-subtitle2 q-mb-md">
        使用同一個 origin proxy 連線到 ZeroClaw Gateway，直接輸入配對碼即可。
      </div>

      <q-form @submit.prevent="handleSubmit">
        <q-input
          v-model="store.pairingCode"
          label="Pairing Code"
          outlined
          dense
          lazy-rules
          :rules="[(val) => !!val?.trim().length || '請輸入配對碼']"
          class="q-mb-md"
          placeholder="123456"
        />

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input
              v-model="store.deviceName"
              label="Device Name (選填)"
              outlined
              dense
              class="q-mb-md"
              placeholder="My Quasar SPA"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="store.deviceType"
              label="Device Type (選填)"
              outlined
              dense
              class="q-mb-md"
              placeholder="browser"
            />
          </div>
        </div>

        <div class="row items-center q-col-gutter-sm q-mb-md">
          <div class="col-auto">
            <q-btn
              label="開始配對"
              color="primary"
              :loading="store.pairingStatus === 'pending'"
              :disable="store.pairingStatus === 'pending' || !store.pairingCode.trim()"
              type="submit"
            />
          </div>
          <div class="col-auto" v-if="store.isPaired">
            <q-btn label="清除配對" color="negative" outline @click="handleClear" />
          </div>
        </div>
      </q-form>

      <q-banner
        v-if="store.pairingStatus === 'success'"
        class="bg-green-1 text-green-10 q-mb-md"
        inline-actions
      >
        <template #avatar>
          <q-icon name="check_circle" />
        </template>
        Pairing 成功！已儲存 token，可繼續進行 agent 對話。
      </q-banner>

      <q-banner
        v-if="store.pairingStatus === 'error'"
        class="bg-red-1 text-red-10 q-mb-md"
        inline-actions
      >
        <template #avatar>
          <q-icon name="error" />
        </template>
        {{ store.errorMessage }}
      </q-banner>

      <div v-if="store.isPaired" class="q-pa-sm bg-grey-1 rounded-borders">
        <div class="text-subtitle2 q-mb-xs">已配對</div>
        <div>
          透過 proxy 連線：<strong>{{ store.normalizedServiceUrl }}</strong>
        </div>
        <div>
          Token 長度: <strong>{{ store.token.length }}</strong>
        </div>
        <div v-if="store.lastPairedAt">配對時間: {{ formattedPairedAt }}</div>
      </div>

      <ZeroClawChat v-if="store.isPaired" />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useZeroClawStore } from 'stores/zeroclaw-store';
import ZeroClawChat from 'components/ZeroClawChat.vue';

const store = useZeroClawStore();

onMounted(() => {
  store.loadFromStorage();
});

const formattedPairedAt = computed(() => {
  if (!store.lastPairedAt) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(store.lastPairedAt));
  } catch {
    return store.lastPairedAt;
  }
});

async function handleSubmit() {
  await store.pair();
}

function handleClear() {
  store.clearPairing();
}
</script>

<style scoped>
.rounded-borders {
  border-radius: 16px;
}
</style>
