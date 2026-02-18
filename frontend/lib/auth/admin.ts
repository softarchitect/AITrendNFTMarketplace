export const ADMIN_SESSION_KEY = "trendmint:admin-token"
export const ADMIN_EMAIL_KEY = "trendmint:admin-email"
export const ADMIN_NAME_KEY = "trendmint:admin-name"
export const ADMIN_ROLE_KEY = "trendmint:admin-role"
export const ADMIN_SESSION_COOKIE = "trendmint_admin_token"

function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
}

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase().includes("admin")
}

export function setAdminSession(token: string, email?: string, displayName?: string, role?: string): void {
  window.localStorage.setItem(ADMIN_SESSION_KEY, token)
  setCookie(ADMIN_SESSION_COOKIE, token)
  if (email) {
    window.localStorage.setItem(ADMIN_EMAIL_KEY, email)
  }
  if (displayName) {
    window.localStorage.setItem(ADMIN_NAME_KEY, displayName)
  }
  if (role) {
    window.localStorage.setItem(ADMIN_ROLE_KEY, role)
  }
  window.dispatchEvent(new Event("trendmint:admin-identity-updated"))
}

export function clearAdminSession(): void {
  window.localStorage.removeItem(ADMIN_SESSION_KEY)
  window.localStorage.removeItem(ADMIN_EMAIL_KEY)
  window.localStorage.removeItem(ADMIN_NAME_KEY)
  window.localStorage.removeItem(ADMIN_ROLE_KEY)
  clearCookie(ADMIN_SESSION_COOKIE)
  window.dispatchEvent(new Event("trendmint:admin-identity-updated"))
}

export function hasAdminSession(): boolean {
  return Boolean(window.localStorage.getItem(ADMIN_SESSION_KEY))
}

export function getAdminToken(): string | null {
  return window.localStorage.getItem(ADMIN_SESSION_KEY)
}

export function getAdminEmail(): string | null {
  return window.localStorage.getItem(ADMIN_EMAIL_KEY)
}

export function getAdminDisplayName(): string | null {
  return window.localStorage.getItem(ADMIN_NAME_KEY)
}

export function getAdminRole(): string | null {
  return window.localStorage.getItem(ADMIN_ROLE_KEY)
}
