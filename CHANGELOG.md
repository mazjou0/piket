# SIPAKAR Changelog

## v1.0.0 — 2025

### Rilis Pertama

**Backend**
- Express.js REST API lengkap dengan 20+ endpoint
- Prisma ORM + PostgreSQL schema dengan 20 tabel
- JWT authentication + refresh token rotation
- Role-Based Access Control (7 role)
- Rate limiting + Helmet security headers
- Audit log untuk semua aksi penting
- Swagger/OpenAPI dokumentasi lengkap
- PDF export (pdfmake) + Excel export (ExcelJS) + CSV
- PostgreSQL triggers untuk update akumulasi poin otomatis
- Cron job: cleanup token, sync akumulasi poin
- File upload: foto siswa/guru, lampiran surat izin
- Import data Dapodik (Excel/CSV)
- QR Code generation + scan API
- Notifikasi in-app + email + WhatsApp (opsional)

**Frontend**
- React 18 + Vite 5 + Tailwind CSS dark mode
- 25+ halaman lengkap
- Dashboard real-time dengan 8 grafik (area, bar, pie, heatmap)
- Modul absensi massal dengan tombol "Semua Hadir"
- Akumulasi poin dengan visual progress bar
- Export laporan langsung dari browser
- PWA — dapat diinstall di mobile
- Zustand state management
- TanStack Query untuk caching data
- Animasi smooth (framer-motion, Tailwind animation)
- Responsive untuk mobile, tablet, desktop

**Infrastruktur**
- Docker + Docker Compose (dev & production)
- Nginx reverse proxy + static file serving
- Installer otomatis untuk Windows (PowerShell) dan Linux
