export const USER_SESSION_KEY = "trendmint:user-token"
export const USER_EMAIL_KEY = "trendmint:user-email"
export const USER_NAME_KEY = "trendmint:user-name"
export const USER_ROLE_KEY = "trendmint:user-role"
export const USER_SESSION_COOKIE = "trendmint_user_token"

function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
}

export function setUserSession(token: string, email?: string, displayName?: string, role?: string): void {
  window.localStorage.setItem(USER_SESSION_KEY, token)
  setCookie(USER_SESSION_COOKIE, token)
  if (email) {
    window.localStorage.setItem(USER_EMAIL_KEY, email)
  }
  if (displayName) {
    window.localStorage.setItem(USER_NAME_KEY, displayName)
  }
  if (role) {
    window.localStorage.setItem(USER_ROLE_KEY, role)
  }
  window.dispatchEvent(new Event("trendmint:user-identity-updated"))
}

export function setUserIdentity(email?: string, displayName?: string, role?: string): void {
  if (email) {
    window.localStorage.setItem(USER_EMAIL_KEY, email)
  }
  if (displayName) {
    window.localStorage.setItem(USER_NAME_KEY, displayName)
  }
  if (role) {
    window.localStorage.setItem(USER_ROLE_KEY, role)
  }
  window.dispatchEvent(new Event("trendmint:user-identity-updated"))
}

export function clearUserSession(): void {
  window.localStorage.removeItem(USER_SESSION_KEY)
  window.localStorage.removeItem(USER_EMAIL_KEY)
  window.localStorage.removeItem(USER_NAME_KEY)
  window.localStorage.removeItem(USER_ROLE_KEY)
  clearCookie(USER_SESSION_COOKIE)
  window.dispatchEvent(new Event("trendmint:user-identity-updated"))
}

export function hasUserSession(): boolean {
  return Boolean(window.localStorage.getItem(USER_SESSION_KEY))
}

export function getUserToken(): string | null {
  return window.localStorage.getItem(USER_SESSION_KEY)
}

export function getUserEmail(): string | null {
  return window.localStorage.getItem(USER_EMAIL_KEY)
}

export function getUserDisplayName(): string | null {
  return window.localStorage.getItem(USER_NAME_KEY)
}
