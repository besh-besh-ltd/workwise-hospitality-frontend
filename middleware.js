import { NextResponse } from "next/server";
import { COOKIE_NAME, readSessionToken } from "@/lib/session";

/**
 * The gate. Runs before anything under /dashboard renders, so an
 * unauthenticated visitor is redirected server-side — no flash of portal
 * content, and no relying on client-side guards a reader could skip past.
 *
 * This is the auth gate for the whole demo.
 
 */
export async function middleware(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await readSessionToken(token);
  if (session) return NextResponse.next();

  const url = request.nextUrl.clone();
  // /login, not "/": the landing page is public now, so sending an
  // unauthenticated visitor there would silently drop them on marketing copy
  // with no sign-in prompt.
  url.pathname = "/login";
  // Remember where they were headed so login can put them back there.
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
