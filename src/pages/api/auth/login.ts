import { createAdminCookie, isSameOrigin } from "../../../lib/admin-auth";

export const prerender = false;

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export async function POST({ request, locals }: any) {
  if (!isSameOrigin(request)) return json({ error: "Permintaan tidak valid." }, 403);
  const env = locals.runtime?.env ?? {};
  if (!env.ADMIN_PASSWORD) return json({ error: "Login belum dikonfigurasi." }, 503);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Data login tidak valid." }, 400); }
  if (typeof body?.password !== "string" || body.password.length > 256) {
    return json({ error: "Password wajib diisi." }, 400);
  }

  const encoder = new TextEncoder();
  const [provided, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(body.password)),
    crypto.subtle.digest("SHA-256", encoder.encode(env.ADMIN_PASSWORD)),
  ]);
  const a = new Uint8Array(provided);
  const b = new Uint8Array(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return json({ error: "Password salah." }, 401);

  return json({ ok: true }, 200, { "set-cookie": await createAdminCookie(env.ADMIN_PASSWORD) });
}

export async function ALL() {
  return json({ error: "Method tidak diizinkan." }, 405);
}
