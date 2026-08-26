# UPN Student Hub

Platform digital terintegrasi khusus mahasiswa UPN "Veteran" Jawa Timur.

## Arsitektur (Phase 1)
- **Backend API**: Laravel 11, berjalan di port 8000 via Nginx.
- **Student Web**: Next.js (App Router), berjalan di port 3000 via Nginx.
- **Admin Web**: Next.js (App Router), berjalan di port 3001 via Nginx.
- **Database**: MySQL 8.0.
- **Cache & Queue**: Redis.

## Persiapan Development (Docker)

1. Pastikan Docker dan Docker Compose telah terinstall.
2. Clone repository ini.
3. Jalankan command berikut untuk membangun dan menjalankan seluruh container:
   ```bash
   docker-compose up -d --build
   ```
4. Copy file `.env` Laravel:
   ```bash
   cp backend-api/.env.example backend-api/.env
   ```
5. Install dependensi Laravel (jika belum) dan jalankan migrasi:
   ```bash
   docker-compose exec php composer install
   docker-compose exec php php artisan key:generate
   docker-compose exec php php artisan migrate
   ```

## Endpoint Akses Lokal
- **API (Backend)**: `http://localhost:8000/api/v1/`
- **Student Web**: `http://localhost:3000/`
- **Admin Web**: `http://localhost:3001/`

## Catatan Tambahan
Sistem ini memisahkan autentikasi `users` (Mahasiswa) dan `admins`. Tabel *database* dibuat seringkas mungkin untuk fondasi (Authentication Foundation).
