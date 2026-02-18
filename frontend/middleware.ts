import { NextRequest, NextResponse } from "next/server"

const ADMIN_COOKIE = "trendmint_admin_token"
const USER_COOKIE = "trendmint_user_token"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const adminToken = request.cookies.get(ADMIN_COOKIE)?.value
  const userToken = request.cookies.get(USER_COOKIE)?.value

  if (pathname === "/auth/sign-in" || pathname === "/auth/sign-up") {
    if (adminToken) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    if (userToken) {
      return NextResponse.redirect(new URL("/app", request.url))
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!adminToken) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url))
    }
  }

  if (pathname.startsWith("/app")) {
    if (!userToken) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*", "/auth/sign-in", "/auth/sign-up"],
}
