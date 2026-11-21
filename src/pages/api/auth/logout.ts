import { clearAdminCookie, isSameOrigin } from "../../../lib/admin-auth";

export const prerender = false;

export async function POST({ request }: any) {
  if (!isSameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Permintaan tidak valid." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": clearAdminCookie(),
    },
  });
}
