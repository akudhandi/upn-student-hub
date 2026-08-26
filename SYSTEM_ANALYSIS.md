# 📘 UPN Student Hub — Analisis Kebutuhan Sistem

> **Proyek Skripsi**
> Platform digital terintegrasi khusus mahasiswa UPN "Veteran" Jawa Timur
> Versi Dokumen: 2.0 | Status: Final Architecture Locked

---

## Daftar Isi

1. [System Overview](#1-system-overview)
2. [Architecture Decisions](#2-architecture-decisions)
3. [MVP Scope](#3-mvp-scope)
4. [Aktor Sistem](#4-aktor-sistem)
5. [Modul Utama](#5-modul-utama)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Relasi Antar Modul](#8-relasi-antar-modul)
9. [Arsitektur Sistem](#9-arsitektur-sistem)
10. [Rancangan Database Awal](#10-rancangan-database-awal)
11. [API Architecture](#11-api-architecture)
12. [Development Roadmap](#12-development-roadmap)

---

## 1. System Overview

### 1.1 Latar Belakang

Mahasiswa UPN "Veteran" Jawa Timur saat ini belum memiliki platform digital terpusat yang memfasilitasi kebutuhan akademis dan non-akademis secara terintegrasi. Kebutuhan seperti jual-beli barang bekas, pencarian kost, pelaporan barang hilang, dan akses informasi event kampus masih tersebar di berbagai platform yang tidak terstruktur, tidak terverifikasi, dan rawan penyalahgunaan.

### 1.2 Tujuan Sistem

**UPN Student Hub** adalah platform digital terintegrasi yang dirancang khusus untuk mahasiswa UPN "Veteran" Jawa Timur dengan tujuan: sentralisasi kebutuhan mahasiswa, verifikasi identitas (khusus mahasiswa UPN), keamanan platform melalui moderasi, efisiensi komunikasi/transaksi, dan penyebaran informasi kampus.

### 1.3 Cakupan Sistem

Sistem terdiri dari **3 aplikasi terpisah** yang saling terhubung dan di-deploy pada VPS tunggal:

```
┌──────────────────┐     ┌──────────────────┐
│  🎓 Student Web  │     │  🔧 Admin Web    │
│  (Next.js Node)  │     │  (Next.js Node)  │
└────────┬─────────┘     └────────┬─────────┘
         │  REST API + WebSocket  │
         └───────────┬────────────┘
                     │
         ┌───────────▼───────────┐
         │  ⚙️ Backend API       │
         │  (Laravel + Sanctum)  │
         │  + Laravel Reverb     │
         └──┬───────┬────────┬──┘
            │       │        │
        ┌───▼──┐ ┌──▼──┐ ┌──▼───┐
        │MySQL │ │Redis│ │ Local│
        └──────┘ └─────┘ │ Disk │
                         └──────┘
```

---

## 2. Architecture Decisions

Keputusan arsitektur final telah dikunci untuk memastikan proyek dapat diselesaikan oleh 1 developer dalam batasan waktu MVP (Minimum Viable Product):

1. **Authentication:** 
   - Menggunakan Email + Password dan Google OAuth.
   - OTP digunakan untuk verifikasi email saat registrasi dan *password recovery*, BUKAN untuk setiap login.
   - SSO Kampus bersifat *Post-MVP* agar tidak menjadi *blocker*.
   - Admin menggunakan kredensial lokal dan *guard* terpisah.
2. **Deployment:** 
   - Menggunakan 1 VPS dengan Docker Compose (Nginx reverse proxy, Laravel PHP app, Next.js Node app, MySQL, Redis, Reverb).
   - Arsitektur mendukung *scaling*, tetapi tidak di-*over-engineer* untuk MVP.
3. **Storage Strategy:** 
   - Menggunakan abstraksi Laravel Storage facade. 
   - MVP menggunakan Local disk storage. 
   - Database hanya menyimpan *relative path* (contoh: `listings/abc123.jpg`). Migrasi ke S3/MinIO di masa depan hanya perlu ganti `.env`.
4. **Map / Location:** 
   - Menggunakan Leaflet.js + OpenStreetMap untuk MVP agar tidak ada dependensi billing (Google Maps).
   - Kost menyimpan *latitude/longitude*. Optimasi *spatial index* MySQL adalah opsional untuk masa depan.
5. **Chat & WebSocket:** 
   - HANYA mendukung 1-on-1 chat. Group chat ditunda ke Post-MVP.
   - Laravel Reverb hanya digunakan untuk *real-time messages*, *typing indicator* (client-side whisper), dan in-app notification.
   - *Presence channel* (status online) hanya aktif saat user masuk ke ruang chat, bukan secara global.
6. **AI Implementation:** 
   - Menggunakan External AI API (OpenAI/Gemini). Tidak ada Python microservice, Vector DB, atau custom ML model.
   - Abstraksi interface digunakan agar provider dapat diganti.
   - AI hanya digunakan untuk *assisted matching* (L&F) dan rekomendasi kontekstual berbasis *recent searches* & *metadata*.
7. **API Design:** 
   - Disederhanakan menggunakan *polymorphic endpoints* (Favorites, Reports, Media Upload) untuk menekan jumlah endpoint dari 80+ menjadi ~50, tanpa mengurangi fungsionalitas.

---

## 3. MVP Scope

Pemotongan *scope* dilakukan secara tegas untuk menjaga fokus pada *delivery* sistem.

### ✅ Masuk MVP (Minimum Viable Product)
- Authentication (Email, OTP, Google OAuth)
- User Profile
- Marketplace Preloved (CRUD, Search, Filter)
- Student Services / Jasa (CRUD, Search, Filter)
- Kost Listing (Leaflet Maps, Lat/Long, Fasilitas)
- Lost & Found (Laporan, Pencarian)
- Interaksi: 1-on-1 Chat (Real-time), Favorite, Rating, Report
- Notification (In-app realtime)
- Admin Moderation & Dashboard
- Basic AI Recommendation & L&F Assisted Matching (via External API)

### ❌ Post-MVP / Future (Tidak dikerjakan sekarang)
- Group Chat
- SSO Kampus (SIAMIK)
- Google Maps API
- Custom Machine Learning / Python Microservices / Vector Database
- Amazon S3 / MinIO (kecuali skala penyimpanan sudah melebihi kapasitas VPS)

---

## 4. Aktor Sistem

1. **Guest (Pengunjung):** Akses landing page, login, register, lihat listing publik terbatas.
2. **Student (Mahasiswa):** Mahasiswa terverifikasi via email/OTP. Bisa menggunakan semua fitur utama platform (Buyer, Seller, Pencari/Pemilik Kost, Pelapor L&F).
3. **Admin (Administrator):** Pengelola platform (Moderasi konten, kelola user, manajemen event/kategori).
4. **System (Automated Process):** Pengirim notifikasi, OTP email, pemanggil AI API.

---

## 5. Modul Utama

1. **Auth & User:** Login, OTP, Google OAuth, manajemen profil.
2. **Marketplace & Jasa:** Listing barang bekas dan layanan mahasiswa.
3. **Kost:** Direktori kost di sekitar kampus dengan peta OSM.
4. **Lost & Found:** Pelaporan barang hilang/ditemukan.
5. **Chat:** Komunikasi real-time 1-on-1 antar mahasiswa.
6. **Interaction:** Sistem Rating, Favorite (Bookmark), dan Report (Pelaporan pelanggaran).
7. **Admin & Notification:** Dashboard statistik, moderasi konten, notifikasi event/sistem.
8. **AI:** Asisten pencocokan L&F dan rekomendasi listing.

---

## 6. Functional Requirements

### 6.1 Authentication & User (FR-AUTH & FR-USER)
- **FR-AUTH-01:** Registrasi dengan email @upnjatim.ac.id dan verifikasi via OTP email.
- **FR-AUTH-02:** Login menggunakan Email + Password atau Google OAuth.
- **FR-AUTH-03:** Password recovery menggunakan OTP email.
- **FR-AUTH-04:** Admin login terpisah dengan guard admin lokal.
- **FR-USER-01:** Manajemen profil mahasiswa (avatar, jurusan, bio).

### 6.2 Modul Listing (FR-LISTING)
- **FR-MKT-01:** CRUD listing Marketplace dengan multiple gambar (diupload terpusat), kategori, dan kondisi.
- **FR-SVC-01:** CRUD listing Jasa Mahasiswa.
- **FR-KOST-01:** CRUD listing Kost dengan fasilitas, harga, dan lokasi (lat/long menggunakan Leaflet/OSM).
- **FR-LNF-01:** CRUD pelaporan Lost & Found.
- **FR-LIST-02:** Pencarian, filter, dan sorting pada semua modul listing.
- **FR-LIST-03:** Fitur menandai status (Terjual, Penuh, Ditemukan, Inaktif).

### 6.3 Interaksi & Chat (FR-INT)
- **FR-CHAT-01:** Real-time 1-on-1 chat berbasis konteks listing tertentu.
- **FR-CHAT-02:** *Typing indicator* menggunakan client-side whisper.
- **FR-RATE-01:** Rating & Review (1-5 bintang) untuk seller, pemilik kost, dan penyedia jasa.
- **FR-FAV-01:** Menyimpan listing ke daftar Favorit.

### 6.4 Moderasi, Notifikasi & AI (FR-SYS)
- **FR-NOTIF-01:** Notifikasi in-app real-time (pesan baru, aktivitas listing).
- **FR-RPT-01:** Fitur pelaporan (Report) listing/user/chat yang melanggar aturan.
- **FR-ADMIN-01:** Dashboard admin untuk statistik, moderasi konten, ban user, dan CRUD kategori.
- **FR-AI-01:** Eksternal AI untuk memberikan rekomendasi item (berdasarkan *recent search*) dan *assisted matching* untuk L&F.

---

## 7. Non-Functional Requirements
- **Performance:** Menggunakan Redis untuk caching dan antrean. Respon API < 500ms.
- **Storage:** Abstraksi File Storage. MVP menggunakan local storage VPS. Database hanya menyimpan *relative path*.
- **Security:** Token-based auth (Sanctum), password hashing, rate limiting, validasi input ketat, batasan CORS.
- **Deployment:** Lingkungan VPS tunggal menggunakan Docker Compose.
- **Testing:** Minimal unit test untuk logic bisnis penting (misal: otorisasi, matching status) dan API test untuk endpoint kritikal. Pendekatan bertahap (tidak wajib full test suite di awal).

---

## 8. Relasi Antar Modul

Menggunakan *Polymorphic Relations* secara ekstensif untuk menyederhanakan desain:
- **Media/Images:** Dapat menempel ke Marketplace, Kost, Jasa, L&F, atau User Profile.
- **Favorites:** Dapat menyimpan berbagai tipe listing.
- **Reports:** Dapat melaporkan berbagai entitas (User, Listing, Chat).
- **Ratings:** Dapat menilai Seller (Marketplace), Kost, atau Jasa.

---

## 9. Arsitektur Sistem

Arsitektur disederhanakan untuk deployment VPS:

1. **Frontend:** Next.js 14/15, TailwindCSS, shadcn/ui. Dijalankan sebagai Node.js app.
2. **Backend Gateway:** Laravel 11 (PHP 8.2+), menyediakan REST API dan melayani upload file (Local Disk).
3. **Real-time Engine:** Laravel Reverb (WebSocket), terkoneksi ke Redis Pub/Sub jika scaling kelak diperlukan.
4. **Data Layer:** MySQL 8 (RDBMS utama) dan Redis (Cache, Session, Queue).
5. **External Services:** Mail Server (SMTP), AI API (OpenAI/Gemini), Google Auth API.

---

## 10. Rancangan Database Awal

Tabel disederhanakan dan disesuaikan dengan MVP. Total ~15 tabel inti.

### 10.1 Core Tables
- `users`: id, email, password, google_id, status.
- `student_profiles`: user_id, nim, name, avatar, faculty, bio.
- `admins`: id, email, password, role.
- `categories`: id, name, slug, type (marketplace/service).
- `otp_codes`: email, code, type, expires_at.

### 10.2 Listing Tables
- `marketplace_listings`: user_id, category_id, title, description, price, status, dll.
- `service_listings`: user_id, category_id, title, price_min, price_max, dll.
- `kost_listings`: user_id, title, address, latitude (DECIMAL), longitude (DECIMAL), price, facilities (JSON), dll.
- `lost_found_reports`: user_id, type, title, location, status, dll.

### 10.3 Polymorphic & Interaction Tables
- `images`: imageable_id, imageable_type, file_path (HANYA RELATIVE PATH), sort_order.
- `favorites`: user_id, favoritable_id, favoritable_type.
- `ratings`: user_id, rateable_id, rateable_type, rating, review.
- `reports`: reporter_id, reportable_id, reportable_type, reason, status, resolved_by.

### 10.4 Chat & System Tables
- `chat_rooms`: id, contextable_type, contextable_id, last_message_at.
- `chat_participants`: chat_room_id, user_id (Hanya 2 user per room untuk MVP).
- `chat_messages`: chat_room_id, user_id, message.
- `notifications`: (Bawaan Laravel) UUID, type, notifiable, data, read_at.

*(Semua tabel listing memiliki fitur Soft Delete `deleted_at` untuk moderasi).*

---

## 11. API Architecture

Disederhanakan menjadi ~50 endpoint dengan pendekatan *polymorphic* dan *reusable*.

### 11.1 Auth & User (REST)
- `POST /api/v1/auth/register`, `/verify-otp`, `/login`, `/google`, `/forgot-password`.
- `GET /api/v1/users/me`, `PUT /api/v1/users/profile`.
- `POST /api/v1/admin/auth/login`.

### 11.2 Unified Media Upload (REST)
- `POST /api/v1/media/upload`: Menerima file, menyimpan di disk lokal, mengembalikan URL absolut dan *relative path* untuk disimpan di DB.

### 11.3 Listing Endpoints (REST)
Pola yang sama diterapkan untuk `/marketplace`, `/kost`, `/services`, `/lost-found`:
- `GET /api/v1/{module}`: Pencarian, filter, pagination.
- `POST /api/v1/{module}`: Create.
- `GET /api/v1/{module}/{slug}`: Detail.
- `PUT`, `DELETE`, `PATCH /{status}` untuk manajemen.

### 11.4 Polymorphic Interactions (REST)
- `POST /api/v1/favorites/toggle`: Body `{ type: 'kost', id: 1 }`.
- `GET /api/v1/favorites`: List semua favorit user.
- `POST /api/v1/reports`: Body `{ type: 'user', id: 5, reason: 'spam' }`.
- `POST /api/v1/ratings`: Menambahkan review.

### 11.5 Chat & Notification (REST & WS)
- `GET /api/v1/chat/rooms`: List kontak/ruangan 1-on-1.
- `GET /api/v1/chat/rooms/{id}/messages`: Load riwayat pesan.
- `POST /api/v1/chat/rooms/{id}/messages`: Kirim pesan (Trigger Reverb Broadcast).
- **WebSocket Event:** `MessageSent`, client `whisper('typing')`.

### 11.6 Admin (REST)
- `GET /api/v1/admin/dashboard/stats`.
- `GET /api/v1/admin/moderation`: Menarik seluruh data dari tabel `reports` dan listing bermasalah.
- `PATCH /api/v1/admin/reports/{id}/resolve`.

---

## 12. Development Roadmap

Urutan implementasi didasarkan pada dependensi teknis, dibagi menjadi 10 fase:

- **Phase 1: Core Foundation & Database**
  - Setup VPS, Docker, Laravel, Next.js, Git.
  - Pembuatan Migration & Seeder untuk seluruh tabel MVP.
- **Phase 2: Authentication & Profile**
  - Laravel Sanctum, Email OTP, Google OAuth, profil mahasiswa.
- **Phase 3: Storage & Media Service**
  - Abstraksi file upload, konversi *relative path* ke *absolute URL* di resource layer.
- **Phase 4: Marketplace & Jasa**
  - Kategori, CRUD listing barang bekas dan jasa. API dan Frontend.
- **Phase 5: Kost & Lost & Found**
  - Integrasi Leaflet.js (OSM) untuk Kost, CRUD L&F.
- **Phase 6: Polymorphic Interactions**
  - Fitur Favorite, Rating, dan Sistem Report.
- **Phase 7: Real-time 1-on-1 Chat & Notifications**
  - Setup Reverb, Redis Pub/Sub, integrasi *chat room*, dan in-app notification.
- **Phase 8: Admin Dashboard & Moderation**
  - Antarmuka khusus admin, penyelesaian laporan (ban user/hide konten).
- **Phase 9: AI Recommendation & Matching**
  - Integrasi API Eksternal (OpenAI/Gemini) untuk *assisted matching* dan rekomendasi.
- **Phase 10: Finalization & Deployment**
  - Testing minimal (API & Core Logic), Security audit (CORS, Rate Limit), Hardening server VPS.
