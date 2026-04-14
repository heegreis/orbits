export interface PairingRequest {
  serviceUrl?: string;
  code: string;
  deviceName?: string;
  deviceType?: string;
}

export function normalizeServiceUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Service URL is required');
  }

  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    throw new Error('Service URL is not valid');
  }
}

function buildApiUrl(serviceUrl: string | undefined, path: string) {
  if (typeof window !== 'undefined') {
    return new URL(path.replace(/^\/+/, ''), window.location.origin).toString();
  }

  if (!serviceUrl) {
    throw new Error('Service URL is required when not running in the browser');
  }

  const baseUrl = normalizeServiceUrl(serviceUrl);
  return new URL(path.replace(/^\/+/, ''), `${baseUrl}/`).toString();
}

export async function pairWithCode(request: PairingRequest): Promise<string> {
  if (!request.code.trim()) {
    throw new Error('Pairing code is required');
  }

  const url = buildApiUrl(request.serviceUrl, '/api/pair');
  const body = {
    code: request.code.trim(),
    device_name: request.deviceName?.trim() || undefined,
    device_type: request.deviceType?.trim() || undefined,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    const message = text || `${response.status} ${response.statusText}`;
    throw new Error(`Pairing failed: ${message}`);
  }

  const json = await response.json();
  if (!json.token || typeof json.token !== 'string') {
    throw new Error('Pairing response did not include token');
  }

  return json.token;
}

export interface ZeroClawSessionMetadata {
  session_id: string;
  name?: string;
  created_at: string;
  last_activity: string;
  message_count: number;
}

export async function fetchSessionList(token: string): Promise<ZeroClawSessionMetadata[]> {
  const url = buildApiUrl(undefined, '/api/sessions');
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const message = text || `${response.status} ${response.statusText}`;
    throw new Error(`Failed to load sessions: ${message}`);
  }

  const json = await response.json();
  if (!Array.isArray(json.sessions)) {
    throw new Error('Unexpected session list response');
  }

  return json.sessions;
}

export async function fetchSessionMessages(
  token: string,
  sessionId: string,
): Promise<Array<{ role: string; content: string }>> {
  const url = buildApiUrl(undefined, `/api/sessions/${encodeURIComponent(sessionId)}/messages`);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const message = text || `${response.status} ${response.statusText}`;
    throw new Error(`Failed to load session messages: ${message}`);
  }

  const json = await response.json();
  if (!Array.isArray(json.messages)) {
    throw new Error('Unexpected session messages response');
  }

  return json.messages;
}

export function getChatWebSocketUrl(
  serviceUrl: string,
  token: string,
  sessionId?: string,
  name?: string,
): string {
  const url =
    typeof window !== 'undefined'
      ? new URL('/ws/chat', window.location.href)
      : new URL('/ws/chat', `${normalizeServiceUrl(serviceUrl)}/`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  if (sessionId) {
    url.searchParams.set('session_id', sessionId);
  }
  if (name) {
    url.searchParams.set('name', name);
  }
  return url.toString();
}
