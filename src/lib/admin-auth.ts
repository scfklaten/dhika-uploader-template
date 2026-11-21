const COOKIE_NAME = "dhika_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

export async function createAdminCookie(secret: string) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })));
  const signature = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(payload),
  ));
  return `${COOKIE_NAME}=${payload}.${toBase64Url(signature)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`;
}

export async function isAdminRequest(request: Request, secret?: string) {
  if (!secret) return false;
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(COOKIE_NAME + "="));
  if (!cookie) return false;

  const token = cookie.slice(COOKIE_NAME.length + 1);
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      fromBase64Url(signature),
      new TextEncoder().encode(payload),
    );
    if (!valid) return false;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return data.role === "admin" && Number.isFinite(data.exp) &&
      data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
