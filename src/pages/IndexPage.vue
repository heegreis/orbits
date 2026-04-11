<template>
  <q-page class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-xl-6">
        <div class="q-mb-xl">
          <div class="text-h5 q-mb-sm">ZeroClaw SPA Pairing</div>
          <div class="text-subtitle1 text-grey">
            此 SPA 可連線到你目前架設的 ZeroClaw Services。請輸入服務 URL 與 pairing code
            進行配對，配對成功後即可繼續使用 agent 對話。
          </div>
        </div>

        <ZeroClawPairingForm />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import ZeroClawPairingForm from 'components/ZeroClawPairingForm.vue';
</script>
