export interface PairingRequest {
  serviceUrl: string;
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

function buildApiUrl(serviceUrl: string, path: string) {
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

export function getChatWebSocketUrl(
  serviceUrl: string,
  token: string,
  sessionId?: string,
  name?: string,
): string {
  const baseUrl = normalizeServiceUrl(serviceUrl);
  const url = new URL('/ws/chat', `${baseUrl}/`);
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
