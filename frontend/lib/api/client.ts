const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authHeader: Record<string, string> = {}
  if (typeof window !== "undefined" && path.startsWith("/api/admin")) {
    const token = window.localStorage.getItem("trendmint:admin-token")
    if (token) {
      authHeader.Authorization = `Bearer ${token}`
    }
  }
  if (typeof window !== "undefined" && path.startsWith("/api/auth")) {
    const token = window.localStorage.getItem("trendmint:user-token")
    if (token) {
      authHeader.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  })

  const data = await parseJsonSafe(response)
  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export function getApiBaseUrl(): string {
  return API_BASE_URL
}
