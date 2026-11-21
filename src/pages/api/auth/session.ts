import { isAdminRequest } from "../../../lib/admin-auth";

export const prerender = false;

export async function GET({ request, locals }: any) {
  const env = locals.runtime?.env ?? {};
  const authenticated = await isAdminRequest(request, env.ADMIN_PASSWORD);
  return new Response(JSON.stringify({ authenticated }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
