import { isAdminRequest, isSameOrigin } from "../../lib/admin-auth";

export const prerender = false;

const MAX_BYTES = 8 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function slug(value: string) {
  return String(value || "gambar")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "gambar";
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export async function POST({ request, locals }: any) {
  const runtime = locals.runtime;
  const env = runtime?.env ?? {};
  if (!isSameOrigin(request) || !(await isAdminRequest(request, env.ADMIN_PASSWORD))) {
    return json({ error: "Silakan login sebagai pengelola terlebih dahulu." }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return json({ error: "Uploader belum dikonfigurasi oleh administrator." }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Form upload tidak valid." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Pilih gambar terlebih dahulu." }, 400);
  const ext = MIME_EXT[file.type];
  if (!ext) return json({ error: "Format yang didukung: JPG, PNG, dan WebP." }, 415);
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return json({ error: "Ukuran gambar maksimal 8 MB." }, 413);
  }

  const base = slug(String(form.get("filename") || file.name.replace(/\.[^.]+$/, "")));
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const path = `${env.IMAGE_DIR || "public/images"}/${base}-${stamp}.${ext}`;
  const content = toBase64(new Uint8Array(await file.arrayBuffer()));
  const branch = env.GITHUB_BRANCH || "main";
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "webstatus-image-uploader",
      },
      body: JSON.stringify({
        message: `Upload image: ${base}`,
        content,
        branch,
      }),
    });
  } catch {
    return json({ error: "Tidak dapat menghubungi GitHub. Coba lagi." }, 502);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json({ error: result.message || "GitHub menolak upload. Periksa izin repository." }, 502);
  }

  const raw = `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${branch}/${path}`;
  return json({ ok: true, path, url: raw });
}

export async function ALL() {
  return json({ error: "Method tidak diizinkan." }, 405);
}
