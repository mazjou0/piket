# SIPAKAR
## Sistem Informasi Rekapitulasi Absensi dan Pelanggaran — SMKN 1 Kras

[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-blueviolet)](https://prisma.io)

---

## Fitur Utama

| Modul | Deskripsi |
|-------|-----------|
| Dashboard | Statistik real-time, grafik harian/bulanan/tahunan, heatmap, top alpha/terlambat |
| Master Data | Siswa, Guru, Kelas, Jurusan, Tahun Ajaran, Semester, User & Role |
| Absensi | Input massal per kelas, simpan semua hadir, lampiran surat izin |
| Pelanggaran | Pencatatan poin, akumulasi otomatis, trigger SP1/SP2/Panggilan Ortu |
| Surat Otomatis | SP1, SP2, SP3, Panggilan Orang Tua — cetak PDF |
| Laporan | Harian, bulanan, semester, per kelas/jurusan — export PDF/Excel/CSV |
| Dashboard BK | Monitoring siswa berisiko berdasarkan poin dan alpha |
| Dashboard Wali Kelas | Ringkasan kelas, daftar hadir hari ini, siswa berisiko |
| QR Code | Generate & scan QR untuk absensi event sekolah |
| Kalender Akademik | Kegiatan sekolah, hari libur nasional terintegrasi |
| Import Dapodik | Import siswa dari Excel/CSV format Dapodik |
| PWA | Dapat diinstal seperti aplikasi mobile |

---

## Teknologi

**Backend**
- Node.js 20 + Express.js
- PostgreSQL 16 + Prisma ORM
- JWT Authentication + Refresh Token + RBAC
- Swagger/OpenAPI dokumentasi
- pdfmake (PDF) + ExcelJS (Excel)
- node-cron (job terjadwal)
- Helmet + Rate Limiting + Audit Log

**Frontend**
- React 18 + Vite 5
- Tailwind CSS + Dark Mode
- Zustand (state management)
- TanStack Query (data fetching)
- Recharts (grafik)
- React Hook Form + Zod
- PWA (vite-plugin-pwa)
- Lucide React (icons)

**Infrastruktur**
- Docker + Docker Compose
- Nginx (reverse proxy + static serving)

---

## Prasyarat

- Node.js >= 18
- PostgreSQL 16 (atau Docker)
- npm >= 9

---

## Instalasi Cepat

### Windows (PowerShell)
```powershell
# Clone / buka folder project
cd D:\WEBSITE\SIPAKAR

# Jalankan installer otomatis
.\scripts\install.ps1
```

### Linux / macOS
```bash
cd /path/to/SIPAKAR
chmod +x scripts/install.sh
./scripts/install.sh
```

### Manual Step-by-Step

**1. Start database**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**2. Setup backend**
```bash
cd backend
cp .env.example .env        # sesuaikan DATABASE_URL
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev                 # berjalan di http://localhost:3001
```

**3. Setup frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # berjalan di http://localhost:5173
```

---

## URL Akses

| Layanan | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api-docs |
| PgAdmin | http://localhost:5050 |

---

## Akun Default (setelah seed)

| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | Admin@123 |
| Admin | admin | Admin@123 |
| BK | bk.konselor | Admin@123 |
| Kepala Sekolah | kepsek | Admin@123 |

> **Segera ganti password di production!**

---

## Struktur Folder

```
SIPAKAR/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Skema database lengkap
│   │   ├── seed.js                # Data awal (jurusan, guru, siswa, dll)
│   │   ├── init.sql               # PostgreSQL triggers
│   │   └── migrations/            # Migration files
│   ├── src/
│   │   ├── app.js                 # Express app setup
│   │   ├── server.js              # Entry point
│   │   ├── config/
│   │   │   ├── prisma.js          # Prisma client
│   │   │   └── swagger.js         # Swagger config
│   │   ├── controllers/           # Route handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── siswa.controller.js
│   │   │   ├── absensi.controller.js
│   │   │   ├── pelanggaran.controller.js
│   │   │   ├── laporan.controller.js
│   │   │   ├── surat.controller.js
│   │   │   ├── qr.controller.js
│   │   │   ├── guru.controller.js
│   │   │   ├── kelas.controller.js
│   │   │   └── user.controller.js
│   │   ├── middlewares/
│   │   │   ├── auth.js            # JWT + RBAC
│   │   │   ├── errorHandler.js    # Global error handler
│   │   │   ├── rateLimiter.js     # Rate limiting
│   │   │   ├── upload.js          # File upload (multer)
│   │   │   └── validate.js        # Validasi request
│   │   ├── routes/                # 20+ route files
│   │   ├── services/
│   │   │   ├── pdf.service.js     # pdfmake PDF generator
│   │   │   ├── excel.service.js   # ExcelJS generator
│   │   │   ├── notification.service.js  # Email + WA + in-app
│   │   │   └── qr.service.js      # QR code generator
│   │   └── utils/
│   │       ├── logger.js          # Winston logger
│   │       ├── jwt.js             # JWT helpers
│   │       ├── response.js        # Standar API response
│   │       ├── audit.js           # Audit log helper
│   │       └── cron.js            # Background jobs
│   └── uploads/                   # File uploads (foto, surat)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Layout, Sidebar, Header
│   │   │   ├── ui/                # Modal, Table, Badge, StatCard, dll
│   │   │   └── forms/             # Reusable form components
│   │   ├── pages/
│   │   │   ├── auth/              # Login
│   │   │   ├── dashboard/         # Dashboard utama
│   │   │   ├── master/            # Siswa, Guru, Kelas, dll
│   │   │   ├── absensi/           # Input, riwayat, rekap
│   │   │   ├── pelanggaran/       # Data & akumulasi
│   │   │   ├── laporan/           # Laporan & export
│   │   │   ├── surat/             # Surat otomatis
│   │   │   ├── bk/                # Dashboard BK
│   │   │   ├── walikelas/         # Dashboard Wali Kelas
│   │   │   ├── qr/                # QR Code
│   │   │   └── profile/           # Profil user
│   │   ├── stores/
│   │   │   ├── authStore.js       # Zustand auth store
│   │   │   └── themeStore.js      # Theme + sidebar state
│   │   ├── lib/
│   │   │   ├── api.js             # Axios instance + interceptor
│   │   │   └── utils.js           # Helpers, constants, formatters
│   │   ├── App.jsx                # Router + protected routes
│   │   └── main.jsx               # Entry point
│   └── public/
│       ├── favicon.svg
│       └── manifest.json
│
├── nginx/
│   └── nginx.conf                 # Nginx production config
├── scripts/
│   ├── install.ps1                # Windows installer
│   ├── install.sh                 # Linux/macOS installer
│   └── dev.ps1                    # Development launcher
├── docker-compose.yml             # Production
├── docker-compose.dev.yml         # Development (DB + PgAdmin only)
└── README.md
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Keterangan | Default |
|----------|-----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | wajib |
| `JWT_SECRET` | Secret key JWT access token (min 32 char) | wajib |
| `JWT_REFRESH_SECRET` | Secret key JWT refresh token | wajib |
| `JWT_EXPIRES_IN` | Durasi access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Durasi refresh token | `7d` |
| `PORT` | Port backend | `3001` |
| `FRONTEND_URL` | URL frontend untuk CORS | `http://localhost:5173` |
| `SMTP_HOST` | SMTP server (opsional) | - |
| `WA_TOKEN` | Token WhatsApp Fonnte (opsional) | - |

### Frontend (`frontend/.env`)

| Variable | Keterangan |
|----------|-----------|
| `VITE_API_URL` | URL backend API |

---

## API Endpoints Utama

### Auth
```
POST   /auth/login          Login
POST   /auth/refresh        Refresh token
POST   /auth/logout         Logout
GET    /auth/me             Data user aktif
PUT    /auth/change-password  Ganti password
```

### Dashboard
```
GET    /dashboard/summary-today       Statistik hari ini
GET    /dashboard/chart-harian        Grafik harian
GET    /dashboard/chart-bulanan       Grafik bulanan
GET    /dashboard/top-alpha           Top 10 alpha
GET    /dashboard/top-terlambat       Top 10 terlambat
GET    /dashboard/kelas-terbaik       Kelas dengan kehadiran terbaik
GET    /dashboard/heatmap             Heatmap kehadiran
GET    /dashboard/summary-bk          Ringkasan untuk BK
```

### Absensi
```
GET    /absensi                       Data absensi (filter tanggal+kelas)
POST   /absensi/simpan-massal         Simpan absensi massal
GET    /absensi/rekap-harian          Rekap per kelas hari ini
GET    /absensi/riwayat/siswa/:id     Riwayat per siswa
GET    /absensi/riwayat/kelas/:id     Riwayat per kelas
PUT    /absensi/:id                   Edit absensi
```

### Pelanggaran
```
GET    /pelanggaran                   Daftar pelanggaran
POST   /pelanggaran                   Catat pelanggaran
GET    /pelanggaran/akumulasi/:siswaId Akumulasi poin siswa
GET    /pelanggaran/jenis             Jenis pelanggaran
```

### Laporan & Export
```
GET    /laporan/rekap-absensi         Rekap per siswa
GET    /laporan/rekap-kelas           Rekap per kelas
GET    /laporan/rekap-pelanggaran     Rekap pelanggaran
GET    /laporan/export/pdf            Export PDF
GET    /laporan/export/excel          Export Excel
GET    /laporan/export/csv            Export CSV
```

Dokumentasi lengkap: **http://localhost:3001/api-docs**

---

## RBAC (Role-Based Access Control)

| Role | Hak Akses |
|------|-----------|
| SUPER_ADMIN | Akses penuh ke semua fitur |
| ADMIN | Master data, absensi, pelanggaran, laporan |
| PETUGAS_PIKET | Input absensi |
| BK | Lihat semua, input pelanggaran, buat surat |
| WALI_KELAS | Lihat kelas sendiri, input absensi kelas sendiri |
| GURU | Lihat data (read-only) |
| KEPALA_SEKOLAH | Lihat semua laporan dan dashboard |

---

## Database

### Aturan Poin Pelanggaran (Otomatis)

| Akumulasi Poin | Status |
|---------------|--------|
| < 25 | Normal |
| ≥ 25 | Warning |
| ≥ 50 | SP1 |
| ≥ 75 | SP2 |
| ≥ 100 | Panggilan Orang Tua |
| ≥ 150 | Rekomendasi BK |

Update akumulasi poin terjadi otomatis via **PostgreSQL Trigger** setiap kali ada insert/update/delete di tabel `pelanggaran`.

---

## Deployment Production

```bash
# Build dan jalankan semua services
docker compose up -d --build

# Akses aplikasi
# http://yourdomain.com
# http://yourdomain.com/api-docs
```

**Sebelum deploy production:**
1. Ganti `JWT_SECRET` dan `JWT_REFRESH_SECRET` dengan nilai acak panjang
2. Ganti password database di `docker-compose.yml`
3. Sesuaikan `FRONTEND_URL` dan `VITE_API_URL`
4. Setup SSL certificate di folder `nginx/ssl/`

---

## Troubleshooting

**Error: `P2021: Table does not exist`**
```bash
cd backend && npx prisma migrate dev
```

**Error: `connect ECONNREFUSED 127.0.0.1:5432`**
```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

**Prisma Client outdated**
```bash
cd backend && npx prisma generate
```

**Frontend blank setelah login**
- Buka DevTools > Console, cek error API
- Pastikan `VITE_API_URL` di `frontend/.env` benar

---

## Lisensi

Dikembangkan untuk keperluan internal SMKN 1 Kras, Kediri, Jawa Timur.

---

*SIPAKAR v1.0.0 — 2025*
