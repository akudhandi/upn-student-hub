# Design System Direction — UPN Student Hub

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

## 1. Visual Identity & Purpose

UPN Student Hub adalah portal ekosistem mahasiswa UPN "Veteran" Jawa Timur (Marketplace Preloved, Jasa & Layanan, Barang Hilang, Event & Info, dan Chat 1-on-1). Antarmuka dirancang tenang, fokus pada keterbacaan katalog dan kepastian status moderasi, bukan dekorasi visual berlebihan.

## 2. Liveliness Dials

- **ENERGY 1 (Calm):** Permukaan hangat netral dengan fokus penuh pada konten mahasiswa dan foto asli listing.
- **RHYTHM 2 (Balanced):** Header dua-kalimat yang konsisten di tiap halaman, diikuti area filter/aksi yang ringkas dan area konten utama yang lega.
- **MOTION 1 (Restrained):** Transisi hover ringan (`150ms–180ms` `cubic-bezier(.2,.8,.2,1)`), zoom gambar `1.03` pada frame `overflow-hidden`, serta penghormatan penuh pada `prefers-reduced-motion: reduce`.

## 3. Core Palette (`2-3 Core + 1 Accent`)

- **Ground utama (`#F4F1EE` — Warm Alabaster):** Mengurangi silau putih murni dan memisahkan latar kanvas dari kartu konten.
- **Permukaan sekunder (`#EFECE8` / `#F6F4F1` — Warm Stone):** Menandai sidebar navigasi, kontrol input, dan area pengelompokan ringan.
- **Permukaan utama & tinta primer (`#FFFFFF` & `#141416` — Matte Obsidian):** Kartu konten memakai putih bersih berbingkai `#E5E0DA`, sedangkan teks primer, harga, dan tombol CTA utama memakai `#141416` untuk kontras WCAG AAA/AA yang jelas.
- **Satu aksen khusus (`#0284C7` — Verified Blue):** Dibatasi khusus pada badge centang akun resmi terverifikasi (HIMA / Ormawa / Fakultas) di profil dan event agar status resmi langsung dikenali tanpa mencemari tombol biasa.

## 4. Typography Pairing & Hierarchy

- **Display / Headings (`Plus Jakarta Sans`):** Dipakai untuk `h1`–`h4`, harga produk, dan nama brand agar struktur halaman terbaca cepat.
- **Body / Controls (`Inter`):** Dipakai untuk teks paragraf, label formulir, filter, dan metadata agar tetap tajam pada ukuran `13px–16px`.
- **Skala minimum:** Seluruh label, badge, dan timestamp minimal `13px`; teks deskripsi dan body kartu minimal `14px`.

## 5. Radius, Borders & Elevation Hierarchy

- **Kartu & Panel Utama:** `rounded-[20px]` dengan hairline `border-[#E5E0DA]` tanpa bayangan berat di kondisi diam.
- **Kontrol Form (`input`, `select`, `textarea`):** `rounded-xl` (`12px`) agar langsung terbaca sebagai area isi.
- **Tombol Aksi & Filter Aktif:** `rounded-full` (`h-11` / minimum `44px` sentuh) sebagai penanda kontrol klik utama.
- **Tag Metadata Pasif:** `rounded-md` (`6px`) untuk label kategori agar terbedakan secara visual dari tombol pill interaktif.
