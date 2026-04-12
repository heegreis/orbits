<template>
  <div class="zero-claw-chat q-mt-lg">
    <div class="row items-center q-mb-sm">
      <div class="col">
        <div class="text-h6">Agent 對話</div>
        <div class="text-caption text-grey">
          目前配對成功，可以開始與 Agent 聊天。連線狀態：<strong>{{ connectionStatus }}</strong>
        </div>
      </div>
      <div class="col-auto" v-if="!isConnected && store.isPaired">
        <q-btn flat size="sm" label="重新連線" color="primary" @click="connect" />
      </div>
    </div>

    <div ref="messagesContainer" class="chat-messages bg-grey-1 q-pa-sm rounded-borders">
      <div v-if="messages.length === 0" class="text-caption text-grey">
        輸入文字並送出，讓 Agent 回覆你。
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="chat-message row items-start"
        :class="message.author"
      >
        <div class="chat-bubble">
          <div class="chat-meta text-caption text-grey">
            {{
              message.author === 'user' ? '你' : message.author === 'assistant' ? 'Agent' : '系統'
            }}
          </div>
          <div class="chat-text">{{ message.text }}</div>
          <div v-if="message.status" class="chat-status text-caption text-grey">
            {{ message.status }}
          </div>
        </div>
      </div>
    </div>

    <q-form @submit.prevent="sendMessage" class="q-mt-md">
      <div class="row items-end q-col-gutter-sm">
        <div class="col">
          <q-input
            v-model="newMessage"
            outlined
            dense
            placeholder="跟 Agent 說點什麼..."
            :disable="!store.isPaired"
            @keyup.enter="sendMessage"
          />
        </div>
        <div class="col-auto">
          <q-btn label="發送" color="primary" :disable="!canSend" @click="sendMessage" />
        </div>
      </div>
    </q-form>

    <q-banner v-if="errorMessage" class="bg-red-1 text-red-10 q-mt-md">
      <template #avatar>
        <q-icon name="error" />
      </template>
      {{ errorMessage }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useZeroClawStore } from 'stores/zeroclaw-store';
import { getChatWebSocketUrl } from '../composables/useZeroClawGateway';

interface ChatMessage {
  id: string;
  author: 'user' | 'assistant' | 'system';
  text: string;
  status?: string | undefined;
}

const store = useZeroClawStore();
const messages = ref<ChatMessage[]>([]);
const newMessage = ref('');
const ws = ref<WebSocket | null>(null);
const errorMessage = ref('');
const sessionId = ref(generateSessionId());
const messagesContainer = ref<HTMLElement | null>(null);

const isConnected = computed(() => ws.value?.readyState === WebSocket.OPEN);
const connectionStatus = computed(() => {
  if (ws.value?.readyState === WebSocket.CONNECTING) return '連線中';
  if (ws.value?.readyState === WebSocket.OPEN) return '已連線';
  if (ws.value?.readyState === WebSocket.CLOSING) return '關閉中';
  if (ws.value?.readyState === WebSocket.CLOSED) return '已斷線';
  return '尚未連線';
});

const canSend = computed(() => store.isPaired && !!newMessage.value.trim() && isConnected.value);

function generateSessionId(): string {
  try {
    return (
      window.crypto?.randomUUID?.() ??
      `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function scrollToBottom() {
  if (!messagesContainer.value) return;
  messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
}

function appendMessage(message: ChatMessage) {
  messages.value.push(message);
  void nextTick(scrollToBottom);
}

function resetAssistantDraft() {
  const last = messages.value[messages.value.length - 1];
  if (last?.author === 'assistant' && last.status === 'pending') {
    delete last.status;
  }
}

function addAssistantChunk(delta: string) {
  const last = messages.value[messages.value.length - 1];
  if (last?.author === 'assistant' && last.status === 'pending') {
    last.text += delta;
  } else {
    appendMessage({
      id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author: 'assistant',
      text: delta,
      status: 'pending',
    });
  }
}

function addSystemMessage(text: string) {
  appendMessage({
    id: `system-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    author: 'system',
    text,
  });
}

function handleWsMessage(event: MessageEvent) {
  if (typeof event.data !== 'string') return;

  try {
    const payload = JSON.parse(event.data);
    const type = payload.type as string | undefined;

    switch (type) {
      case 'session_start':
        if (payload.name) {
          addSystemMessage(`聊天已啟動：${payload.name}`);
        }
        break;
      case 'connected':
        addSystemMessage('已建立聊天連線');
        break;
      case 'chunk':
        addAssistantChunk(payload.content ?? '');
        break;
      case 'chunk_reset':
        resetAssistantDraft();
        break;
      case 'done':
        resetAssistantDraft();
        break;
      case 'thinking':
        addAssistantChunk(payload.content ?? '');
        break;
      case 'tool_call':
        addSystemMessage(`工具呼叫：${payload.name} ${JSON.stringify(payload.args ?? {})}`);
        break;
      case 'tool_result':
        addSystemMessage(`工具結果：${payload.name} ${payload.output ?? ''}`);
        break;
      case 'error':
        addSystemMessage(`錯誤：${payload.message ?? '未知錯誤'}`);
        break;
      default:
        if (payload.content) {
          addSystemMessage(`收到未知訊息：${JSON.stringify(payload)}`);
        }
        break;
    }
  } catch (err) {
    addSystemMessage(`解析訊息失敗：${String(err)}`);
  }
}

function connect() {
  if (!store.isPaired) {
    errorMessage.value = '無法連線，尚未配對。';
    return;
  }
  if (!store.token) {
    errorMessage.value = '尚未取得配對 token，無法連線。';
    return;
  }

  if (ws.value) {
    ws.value.close();
    ws.value = null;
  }

  errorMessage.value = '';
  const url = getChatWebSocketUrl(
    window.location.origin,
    store.token,
    sessionId.value,
    store.deviceName || 'ZeroClaw SPA',
  );

  try {
    const socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      errorMessage.value = '';
    });

    socket.addEventListener('message', handleWsMessage);
    socket.addEventListener('error', () => {
      errorMessage.value = 'WebSocket 連線失敗';
    });

    socket.addEventListener('close', () => {
      if (ws.value === socket) {
        ws.value = null;
      }
    });

    ws.value = socket;
  } catch (err) {
    errorMessage.value = String(err);
  }
}

function sendMessage() {
  const content = newMessage.value.trim();
  if (!content || !store.isPaired || !ws.value || ws.value.readyState !== WebSocket.OPEN) {
    return;
  }

  appendMessage({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    author: 'user',
    text: content,
  });

  try {
    ws.value.send(JSON.stringify({ type: 'message', content }));
  } catch (err) {
    errorMessage.value = `送出失敗：${String(err)}`;
  }

  newMessage.value = '';
}

onMounted(() => {
  if (store.isPaired) {
    connect();
  }
});

onBeforeUnmount(() => {
  ws.value?.close();
});

watch(
  () => store.isPaired,
  (paired) => {
    if (paired) {
      connect();
    } else {
      ws.value?.close();
      ws.value = null;
    }
  },
);

watch(
  () => store.token,
  (token) => {
    if (store.isPaired && token) {
      connect();
    }
  },
);
</script>

<style scoped>
.zero-claw-chat .chat-messages {
  max-height: 320px;
  overflow-y: auto;
}
.zero-claw-chat .chat-message {
  margin-bottom: 0.75rem;
}
.zero-claw-chat .chat-message.user {
  justify-content: flex-end;
}
.zero-claw-chat .chat-message.assistant {
  justify-content: flex-start;
}
.zero-claw-chat .chat-message.system {
  justify-content: center;
}
.zero-claw-chat .chat-bubble {
  display: inline-flex;
  flex-direction: column;
  padding: 0.8rem 1rem;
  border-radius: 14px;
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
}
.zero-claw-chat .chat-message.user .chat-bubble {
  background-color: var(--q-primary-2);
  color: var(--q-primary-11);
}
.zero-claw-chat .chat-message.assistant .chat-bubble {
  background-color: var(--q-grey-2);
  color: var(--q-dark);
}
.zero-claw-chat .chat-message.system .chat-bubble {
  background-color: #f5f5f5;
  color: var(--q-grey-8);
  font-style: italic;
}
.zero-claw-chat .chat-meta {
  margin-bottom: 0.25rem;
}
.zero-claw-chat .chat-status {
  margin-top: 0.25rem;
}
</style>
