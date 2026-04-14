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

    <div class="q-pa-md bg-grey-2 rounded-borders q-mb-md">
      <div class="row items-center q-col-gutter-sm q-mb-sm">
        <div class="col">
          <div class="text-subtitle2">Session 管理</div>
          <div class="text-caption text-grey">
            目前 Session：<strong>{{ selectedSessionLabel }}</strong>
          </div>
          <div class="text-caption text-grey">
            會話名稱：<strong>{{ sessionName || '未設定' }}</strong>
          </div>
        </div>
        <div class="col-auto row q-col-gutter-sm items-center">
          <q-btn
            size="sm"
            label="刷新 Session 列表"
            color="primary"
            outline
            :loading="sessionsLoading"
            @click="loadSessions"
          />
          <q-btn
            size="sm"
            label="建立新 Session"
            color="secondary"
            outline
            @click="createNewSession"
          />
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-md-6">
          <q-input
            v-model="sessionName"
            label="Session 名稱 (選填)"
            outlined
            dense
            placeholder="例如：客服對話、project alpha"
          />
        </div>
      </div>

      <q-banner v-if="historyLoading" class="bg-blue-1 text-blue-10 q-mb-md" inline-actions>
        <template #avatar>
          <q-icon name="hourglass_top" />
        </template>
        正在載入 session 歷史...
      </q-banner>

      <q-banner v-if="sessionsError" class="bg-red-1 text-red-10 q-mb-md">
        <template #avatar>
          <q-icon name="error" />
        </template>
        {{ sessionsError }}
      </q-banner>

      <div v-if="sessions.length" class="q-mb-sm">
        <q-list bordered padding>
          <q-item
            v-for="session in sessions"
            :key="session.session_id"
            clickable
            :active="selectedSessionId === session.session_id"
            @click="selectSession(session.session_id)"
          >
            <q-item-section>
              <q-item-label>
                <strong>{{ session.name || session.session_id }}</strong>
              </q-item-label>
              <q-item-label caption>
                建立：{{ formatTimestamp(session.created_at) }} · 最近活動：{{
                  formatTimestamp(session.last_activity)
                }}
                · 訊息數：{{ session.message_count }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-else class="text-caption text-grey">
        目前沒有已儲存的 session。請點擊「刷新 Session 列表」以載入最新資料。
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
import {
  fetchSessionList,
  fetchSessionMessages,
  getChatWebSocketUrl,
} from '../composables/useZeroClawGateway';
import type { ZeroClawSessionMetadata } from '../composables/useZeroClawGateway';

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
const sessionName = ref('');
const sessions = ref<ZeroClawSessionMetadata[]>([]);
const selectedSessionId = ref(sessionId.value);
const sessionsLoading = ref(false);
const historyLoading = ref(false);
const sessionsError = ref('');
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
const selectedSessionLabel = computed(() => {
  if (sessionName.value) {
    return sessionName.value;
  }
  if (selectedSessionId.value) {
    return selectedSessionId.value;
  }
  return '尚未選擇';
});

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

function formatTimestamp(timestamp: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
}

function handleWsMessage(event: MessageEvent) {
  if (typeof event.data !== 'string') return;

  try {
    const payload = JSON.parse(event.data);
    const type = payload.type as string | undefined;

    switch (type) {
      case 'session_start':
        if (payload.name) {
          sessionName.value = payload.name;
          addSystemMessage(`聊天已啟動：${payload.name}`);
        }
        if (payload.session_id) {
          sessionId.value = payload.session_id;
          selectedSessionId.value = payload.session_id;
        }
        if (payload.message_count !== undefined) {
          addSystemMessage(`目前訊息數：${payload.message_count}`);
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

  if (!selectedSessionId.value) {
    selectedSessionId.value = generateSessionId();
  }
  sessionId.value = selectedSessionId.value;

  errorMessage.value = '';
  const url = getChatWebSocketUrl(
    window.location.origin,
    store.token,
    sessionId.value,
    sessionName.value || undefined,
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

async function loadSessions() {
  if (!store.token) {
    sessionsError.value = '需要先完成配對才能讀取會話';
    return;
  }
  sessionsError.value = '';
  sessionsLoading.value = true;
  try {
    sessions.value = await fetchSessionList(store.token);
    selectedSessionId.value = selectedSessionId.value || sessionId.value;
  } catch (err) {
    sessionsError.value = err instanceof Error ? err.message : String(err);
  } finally {
    sessionsLoading.value = false;
  }
}

async function loadSessionHistory(sessionIdValue: string) {
  if (!store.token) {
    sessionsError.value = '需要先完成配對才能讀取會話';
    return;
  }

  historyLoading.value = true;
  sessionsError.value = '';
  try {
    const history = await fetchSessionMessages(store.token, sessionIdValue);
    messages.value = history.map((item, index) => ({
      id: `history-${sessionIdValue}-${index}`,
      author: item.role === 'user' ? 'user' : item.role === 'assistant' ? 'assistant' : 'system',
      text: item.content,
    }));
  } catch (err) {
    sessionsError.value = err instanceof Error ? err.message : String(err);
    messages.value = [];
  } finally {
    historyLoading.value = false;
  }
}

async function selectSession(sessionIdValue: string) {
  selectedSessionId.value = sessionIdValue;
  sessionId.value = sessionIdValue;
  const session = sessions.value.find((item) => item.session_id === sessionIdValue);
  sessionName.value = session?.name ?? '';
  messages.value = [];
  await loadSessionHistory(sessionIdValue);
  connect();
}

function createNewSession() {
  selectedSessionId.value = generateSessionId();
  sessionId.value = selectedSessionId.value;
  sessionName.value = '';
  messages.value = [];
  connect();
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
    void loadSessions();
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
      void loadSessions();
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
      void loadSessions();
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
