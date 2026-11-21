import { isAdminRequest, isSameOrigin } from "../../../lib/admin-auth";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 70) || "artikel";
}

export async function POST({ request, locals }: any) {
  const env = locals.runtime?.env ?? {};
  if (!isSameOrigin(request) || !(await isAdminRequest(request, env.ADMIN_PASSWORD))) {
    return json({ error: "Sesi login tidak valid. Silakan login kembali." }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return json({ error: "Konfigurasi GitHub belum lengkap." }, 503);
  }

  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Data artikel tidak valid." }, 400); }
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const image = typeof body?.image === "string" ? body.image.trim() : "";
  if (!title || title.length > 160) return json({ error: "Judul wajib diisi (maksimal 160 karakter)." }, 400);
  if (!content || content.length > 30000) return json({ error: "Tulisan wajib diisi (maksimal 30.000 karakter)." }, 400);
  if (image && (!image.startsWith("https://raw.githubusercontent.com/" + env.GITHUB_OWNER + "/" + env.GITHUB_REPO + "/") || image.length > 1000)) {
    return json({ error: "Alamat gambar tidak valid." }, 400);
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const slug = slugify(title) + "-" + stamp;
  const description = content.replace(/\s+/g, " ").slice(0, 180) || title;
  const frontmatter = [
    "---",
    "title: " + JSON.stringify(title),
    "description: " + JSON.stringify(description),
    'pubDate: "' + date + '"',
    ...(image ? ["heroImage: " + JSON.stringify(image)] : []),
    "---",
    "",
  ].join("\n");
  const markdown = frontmatter + content.replace(/\r\n?/g, "\n") + "\n";
  const path = "src/content/blog/" + slug + ".md";
  const branch = env.GITHUB_BRANCH || "main";
  const url = "https://api.github.com/repos/" + env.GITHUB_OWNER + "/" + env.GITHUB_REPO + "/contents/" + path;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "PUT",
      headers: {
        authorization: "Bearer " + env.GITHUB_TOKEN,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "dhika-astro-post-publisher",
      },
      body: JSON.stringify({
        message: "Publish article: " + title,
        content: btoa(unescape(encodeURIComponent(markdown))),
        branch,
      }),
    });
  } catch {
    return json({ error: "Tidak dapat menghubungi GitHub. Coba lagi." }, 502);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: result.message || "Artikel gagal disimpan ke GitHub." }, 502);
  return json({ ok: true, slug, path, url: "/burung/" + slug + "/" });
}

export async function ALL() {
  return json({ error: "Method tidak diizinkan." }, 405);
}
