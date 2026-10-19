const pathname = window.location.pathname
export const BASE_PATH = pathname.endsWith('/') ? pathname : `${pathname.slice(0, pathname.lastIndexOf('/') + 1)}`
export const API_BASE = `${BASE_PATH}api`

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) {
    super(message)
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && typeof init.body === 'string' && !headers.has('content-type'))
    headers.set('content-type', 'application/json')
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'same-origin' })
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message = typeof body === 'object' && body && 'error' in body ? String(body.error) : `Request failed (${response.status})`
    throw new ApiError(message, response.status, typeof body === 'object' ? body.details : undefined)
  }
  return body as T
}

export function json(method: string, body?: unknown): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) }
}

export function libraryUrl(path: string, download = false) {
  return `${API_BASE}/library/content/${path.split('/').map(encodeURIComponent).join('/')}${download ? '?download=1' : ''}`
}
