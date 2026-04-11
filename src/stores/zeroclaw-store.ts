import { defineStore, acceptHMRUpdate } from 'pinia';
import { pairWithCode } from '../composables/useZeroClawGateway';

export interface ZeroClawState {
  serviceUrl: string;
  pairingCode: string;
  deviceName: string;
  deviceType: string;
  token: string;
  pairingStatus: 'idle' | 'pending' | 'success' | 'error';
  errorMessage: string;
  lastPairedAt: string | null;
}

const STORAGE_KEYS = {
  serviceUrl: 'zeroclaw.serviceUrl',
  token: 'zeroclaw.token',
};

export const useZeroClawStore = defineStore('zeroclaw', {
  state: (): ZeroClawState => ({
    serviceUrl: '',
    pairingCode: '',
    deviceName: '',
    deviceType: '',
    token: '',
    pairingStatus: 'idle',
    errorMessage: '',
    lastPairedAt: null,
  }),

  getters: {
    isPaired: (state) => state.token.length > 0,
    normalizedServiceUrl: (state) => {
      try {
        const url = new URL(state.serviceUrl.trim());
        return url.toString().replace(/\/+$/, '');
      } catch {
        return state.serviceUrl.trim();
      }
    },
  },

  actions: {
    loadFromStorage() {
      if (typeof window === 'undefined') {
        return;
      }
      const storedUrl = window.localStorage.getItem(STORAGE_KEYS.serviceUrl);
      const storedToken = window.localStorage.getItem(STORAGE_KEYS.token);
      if (storedUrl) {
        this.serviceUrl = storedUrl;
      }
      if (storedToken) {
        this.token = storedToken;
      }
    },

    persist() {
      if (typeof window === 'undefined') {
        return;
      }
      window.localStorage.setItem(STORAGE_KEYS.serviceUrl, this.serviceUrl);
      if (this.token) {
        window.localStorage.setItem(STORAGE_KEYS.token, this.token);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.token);
      }
    },

    async pair() {
      this.pairingStatus = 'pending';
      this.errorMessage = '';
      try {
        const token = await pairWithCode({
          serviceUrl: this.serviceUrl,
          code: this.pairingCode,
          deviceName: this.deviceName,
          deviceType: this.deviceType,
        });
        this.token = token;
        this.pairingStatus = 'success';
        this.lastPairedAt = new Date().toISOString();
        this.persist();
      } catch (error) {
        this.pairingStatus = 'error';
        this.errorMessage = error instanceof Error ? error.message : String(error);
      }
    },

    clearPairing() {
      this.token = '';
      this.pairingStatus = 'idle';
      this.errorMessage = '';
      this.lastPairedAt = null;
      this.persist();
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useZeroClawStore, import.meta.hot));
}
