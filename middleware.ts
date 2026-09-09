import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic Auth gate.
 *
 * Vercel's own Password Protection is a paid Pro add-on and is password-only, so
 * this replaces it: real usernames, as many credentials as you like, and free on
 * any plan. Credentials come from the BASIC_AUTH_USERS environment variable as
 * comma-separated `user:password` pairs:
 *
 *     BASIC_AUTH_USERS="allan:s3cret,gwen:h0nkhonk"
 *
 * A username cannot contain ":" or ","; a password cannot contain "," (the first
 * colon separates the pair, so passwords may contain colons).
 */

const REALM = "Jyut Dictation";

function challenge(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Compare without an early exit, so response time doesn't leak the password. */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function credentialsFor(raw: string, username: string): string | undefined {
  for (const entry of raw.split(",")) {
    const pair = entry.trim();
    const separator = pair.indexOf(":");
    if (separator <= 0) continue;
    if (pair.slice(0, separator) === username) return pair.slice(separator + 1);
  }
  return undefined;
}

function decodeBasic(header: string): { username: string; password: string } | null {
  try {
    const base64 = header.slice("Basic ".length);
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const configured = process.env.BASIC_AUTH_USERS?.trim();

  if (!configured) {
    // Fail closed in production: a missing variable must never silently publish the
    // site. Locally it just gets out of the way so `npm run dev` needs no setup.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse(
      "BASIC_AUTH_USERS is not set, so this deployment is refusing all requests.",
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return challenge();

  const supplied = decodeBasic(header);
  if (!supplied) return challenge();

  const expected = credentialsFor(configured, supplied.username);
  if (expected === undefined || !timingSafeEqual(supplied.password, expected)) {
    return challenge();
  }

  return NextResponse.next();
}

export const config = {
  // Everything, deliberately: the audio clips and the JS bundle are behind the gate
  // too, not just the HTML. Browsers replay the credentials automatically, so this
  // costs one extra prompt on first load and nothing after that.
  matcher: "/:path*",
};
