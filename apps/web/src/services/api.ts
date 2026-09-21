const API_BASE = '/api';

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; error?: string; [key: string]: any }> {
  const token = localStorage.getItem('sfoss_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: `Server returned a non-JSON response (${res.status} ${res.statusText}) for ${url}.`,
      };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network request failed. Ensure local server is running.',
    };
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('sfoss_token');
}

export async function downloadFileApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; blob?: Blob; error?: string; status?: number }> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          status: res.status,
          error: errorData.error || `Request failed with status ${res.status}`,
        };
      }
      return {
        success: false,
        status: res.status,
        error: `Request failed with status ${res.status} (${res.statusText})`,
      };
    }

    const blob = await res.blob();
    return {
      success: true,
      blob,
      status: res.status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network request failed. Ensure local server is running.',
    };
  }
}
