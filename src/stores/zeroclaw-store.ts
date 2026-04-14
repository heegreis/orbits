import { defineStore, acceptHMRUpdate } from 'pinia';
import { pairWithCode } from '../composables/useZeroClawGateway';

export interface ZeroClawState {
  pairingCode: string;
  deviceName: string;
  deviceType: string;
  token: string;
  pairingStatus: 'idle' | 'pending' | 'success' | 'error';
  errorMessage: string;
  lastPairedAt: string | null;
}

const STORAGE_KEYS = {
  token: 'zeroclaw.token',
};

export const useZeroClawStore = defineStore('zeroclaw', {
  state: (): ZeroClawState => ({
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
    normalizedServiceUrl: () => {
      if (typeof window === 'undefined') {
        return '';
      }
      return window.location.origin;
    },
  },

  actions: {
    loadFromStorage() {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const storedToken = window.localStorage.getItem(STORAGE_KEYS.token);
        if (storedToken) {
          this.token = storedToken;
        }
      } catch {
        // localStorage may be disabled in some environments; do nothing.
      }
    },

    persist() {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        if (this.token) {
          window.localStorage.setItem(STORAGE_KEYS.token, this.token);
        } else {
          window.localStorage.removeItem(STORAGE_KEYS.token);
        }
      } catch {
        // localStorage may be unavailable; ignore persistence failures.
      }
    },

    async pair() {
      this.pairingStatus = 'pending';
      this.errorMessage = '';
      try {
        const token = await pairWithCode({
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
