# PROJECT STATUS — Dhika Uploader Template

> Catatan teknis utama untuk melanjutkan pengembangan proyek ini. Baca file ini dan periksa kode terbaru di GitHub sebelum melakukan perubahan.

## 1. Identitas proyek

- **Repository:** `scfklaten/dhika-uploader-template`
- **Branch:** `main`
- **Website:** https://dhika.scfk24.web.id/
- **Cloudflare Worker:** `dhika-uploader-template`
- **Cloudflare Pages/Workers Builds:** terhubung ke repo di atas, menjalankan `npm run build` lalu `npx wrangler deploy`
- **Root directory:** `/`
- **Framework:** Astro 5.16.9
- **Cloudflare adapter:** 12.6.12
- **Konten artikel:** `src/content/blog/`
- **Route artikel:** `/burung/{slug}/`

## 2. Batas proyek — WAJIB DIPATUHI

1. Kerjakan hanya repository **`scfklaten/dhika-uploader-template`** untuk proyek ini.
2. Worker yang sesuai adalah **`dhika-uploader-template`**.
3. **Jangan mengubah atau deploy proyek `koleksi-burung`**. Itu proyek terpisah.
4. Jangan mencampur proyek ini dengan repo `uploader-template`; repo tersebut adalah backup.
5. Jangan menghapus repo, Worker, domain, konfigurasi, atau resource Cloudflare tanpa instruksi eksplisit.
6. Jangan menampilkan, menyalin, atau memasukkan nilai secret/token/password ke dokumentasi, chat, atau commit.

## 3. Tujuan produk

CMS sederhana untuk klien yang tidak perlu memahami GitHub, Markdown, Astro, atau Cloudflare. Alur yang diinginkan seperti membuat postingan:
1. Isi judul.
2. Isi tulisan.
3. Upload gambar dan lihat preview.
4. Klik Publish.
5. Sistem menyimpan artikel ke GitHub, menunggu build/deploy Cloudflare, lalu membuka artikel setelah benar-benar tersedia.

Jangan menyatakan artikel berhasil tayang sebelum ketersediaan artikel terverifikasi.

## 4. Fitur yang sudah dibuat

### Login admin
- Implementasi autentikasi berada di `src/lib/admin-auth.ts`.
- Session menggunakan HMAC-SHA256, cookie `dhika_admin_session`, masa berlaku 12 jam.
- Cookie: HttpOnly, Secure, SameSite=Strict.
- Login/session/logout:
  - `src/pages/api/auth/login.ts`
  - `src/pages/api/auth/session.ts`
  - `src/pages/api/auth/logout.ts`
- Header menampilkan akses admin/login melalui `src/components/Header.astro`.
- Login pernah diuji pengguna dan dinyatakan berfungsi.

### Upload gambar
- Halaman: `src/pages/upload.astro`
- API: `src/pages/api/upload.ts`
- Format yang didukung: JPG, PNG, WebP.
- Batas ukuran: 8 MB.
- File disimpan ke `public/images/` melalui GitHub Contents API.
- API upload dilindungi pemeriksaan same-origin dan session admin.

### Posting artikel
- Form composer: `src/pages/post.astro`
- API penyimpanan artikel: `src/pages/api/posts.ts`
- API memeriksa same-origin dan session admin.
- Judul maksimal 160 karakter; isi maksimal 30.000 karakter.
- Gambar opsional dan URL gambar dibatasi ke raw.githubusercontent.com dari repo proyek.
- Artikel Markdown disimpan di `src/content/blog/{slug}.md`.
- Form menampilkan status proses dan menunggu artikel terbit sebelum redirect.
- Pemeriksaan redirect menggunakan GET dan mencocokkan judul H1 artikel, bukan hanya mengandalkan HTTP 200.
- Jika menunggu terlalu lama, pengguna diberi tautan artikel dan instruksi agar tidak mengirim ulang secara membabi buta.

### Daftar artikel
- Halaman utama: `src/pages/index.astro` (menampilkan 3 artikel terbaru).
- Daftar semua artikel: `src/pages/burung/index.astro`.
- Detail artikel: `src/pages/burung/[...slug].astro`.

## 5. Pengurutan artikel — perubahan terbaru

Masalah sebelumnya: `pubDate` hanya menyimpan tanggal (tanpa jam/menit), sehingga artikel yang dibuat pada hari yang sama tidak dapat diurutkan berdasarkan waktu publikasi yang sebenarnya. Pengurutan berdasarkan slug juga tidak andal karena slug diawali judul.

Perbaikan yang baru dikirim:
- `src/pages/api/posts.ts` menambahkan field frontmatter `publishedAt` dengan timestamp ISO lengkap dari waktu pembuatan artikel.
- `src/content.config.ts` menerima `publishedAt` sebagai tanggal opsional agar artikel lama tetap valid.
- `src/pages/index.astro` dan `src/pages/burung/index.astro` mengurutkan berdasarkan `publishedAt` dari terbaru ke terlama.
- Untuk artikel lama yang belum memiliki `publishedAt`, fungsi fallback membaca timestamp 14 digit di akhir slug. Jika tidak ditemukan, fallback terakhir adalah `pubDate`.

### Commit perubahan pengurutan
- `src/pages/index.astro`: `6a7b311ca14cd7a7af1bdcc77a4839f14a7e29b9`
- `src/pages/burung/index.astro`: `1132aa1029691b69264cb25edd77c6956cee4440`
- `src/pages/api/posts.ts`: `7c82e00a570f519dcdbd0af237ce5b399b38563a`
- `src/content.config.ts`: `66c7200d4f6776ad4b7093817694c871bb60cda5`

**Status build saat catatan ini dibuat:** Cloudflare build untuk commit `66c7200d4f6776ad4b7093817694c871bb60cda5` berstatus sukses (21 Nov 2026, sekitar 16:48 UTC).

**Status pengujian:** build sukses, tetapi perilaku urutan berdasarkan jam/menit masih harus diuji langsung di website dengan beberapa artikel yang dibuat berurutan. Jangan menganggap fitur ini sudah terverifikasi hanya karena build sukses.

## 6. File penting

| File | Fungsi |
|---|---|
| `src/lib/admin-auth.ts` | Validasi session admin |
| `src/components/Header.astro` | Header dan akses login admin |
| `src/pages/upload.astro` | Form upload gambar |
| `src/pages/api/upload.ts` | Endpoint upload gambar ke GitHub |
| `src/pages/post.astro` | Form penulisan dan publikasi artikel |
| `src/pages/api/posts.ts` | Endpoint pembuatan file artikel Markdown |
| `src/content.config.ts` | Schema koleksi artikel |
| `src/pages/index.astro` | Beranda dan artikel terbaru |
| `src/pages/burung/index.astro` | Daftar semua artikel |
| `src/pages/burung/[...slug].astro` | Halaman detail artikel |

## 7. Konfigurasi deployment dan environment

Workers Builds diketahui menggunakan:
- Branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

Nama environment variable/binding yang digunakan aplikasi:
- `ADMIN_PASSWORD` — secret autentikasi admin.
- `GITHUB_TOKEN` — secret token untuk GitHub Contents API.
- `GITHUB_OWNER` — owner repo.
- `GITHUB_REPO` — nama repo.
- `GITHUB_BRANCH` — branch target.
- `IMAGE_DIR` — direktori gambar.
- `ASSETS` — binding assets Cloudflare.

Nilai secret tidak dicatat di file ini. Jangan meminta pengguna menempelkan secret ke chat; cukup periksa nama binding dan minta pengguna mengatur ulang melalui dashboard bila diperlukan.

## 8. Cara kerja sebelum mengubah kode

1. Baca file ini.
2. Pastikan repository aktif adalah `scfklaten/dhika-uploader-template` dan branch `main`.
3. Ambil versi file terbaru dari GitHub; jangan mengandalkan salinan kode lama dari percakapan.
4. Pahami alur dan dependensi file yang akan diubah.
5. Kerjakan satu masalah dalam satu perubahan sekecil mungkin.
6. Jangan merapikan CSS/struktur atau mengubah fitur lain tanpa kebutuhan dan persetujuan.
7. Setelah perubahan, periksa diff/isi file dan pastikan tidak ada bagian penting yang terhapus.
8. Pantau Cloudflare build sampai status sukses atau gagal. Jika gagal, periksa log sebelum menyatakan selesai.
9. Uji fitur yang diubah dan fitur terkait yang mungkin terdampak.
10. Perbarui bagian status dan pengujian di file ini setelah ada hasil baru.

## 9. Daftar pekerjaan berikutnya

- [ ] Uji urutan artikel terbaru berdasarkan jam, menit, dan detik setelah build timestamp terpasang.
- [ ] Buat dua atau lebih artikel dalam satu hari dan pastikan yang paling baru tampil paling atas di beranda dan halaman daftar.
- [ ] Pastikan artikel lama tetap tampil dan tersusun wajar.
- [ ] Uji ulang alur publish dari form sampai artikel benar-benar tayang.
- [ ] Pastikan upload gambar, login, dan logout tetap berfungsi setelah perubahan.
- [ ] Catat hasil pengujian aktual, termasuk URL artikel dan commit terkait.

## 10. Catatan untuk sesi AI berikutnya

Mulai dengan membaca `PROJECT-STATUS.md` dari repo **`scfklaten/dhika-uploader-template`**. Setelah itu periksa commit terbaru, file terkait, dan status build Cloudflare. Jangan langsung mengedit berdasarkan ringkasan ini saja karena kondisi repo mungkin sudah berubah.

Jika pengguna meminta pindah repo, jangan memindahkan atau deploy apa pun sebelum nama repo tujuan dikonfirmasi. Pertahankan repo lama sampai repo tujuan selesai diverifikasi.
