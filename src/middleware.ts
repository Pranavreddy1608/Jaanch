import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Keep in sync with SESSION_COOKIE in src/lib/session.ts (middleware runs on
// the Edge runtime and can't import that module's node:crypto dependency).
const SESSION_COOKIE = 'gem_session';
const PUBLIC_PATHS = ['/sign-in'];

/**
 * Gate: an unauthenticated visitor is sent to /sign-in. This only checks
 * for the presence of the session cookie - the signature is verified (and
 * the role is enforced) server-side in the actions that need it, so a
 * forged cookie gets past this redirect but not past recordDecision.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static asset files (icons, images).
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
