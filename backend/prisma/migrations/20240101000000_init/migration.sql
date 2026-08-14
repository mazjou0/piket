-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'PETUGAS_PIKET', 'BK', 'WALI_KELAS', 'GURU', 'KEPALA_SEKOLAH');
CREATE TYPE "JenisKelamin" AS ENUM ('L', 'P');
CREATE TYPE "StatusSiswa" AS ENUM ('AKTIF', 'LULUS', 'PINDAH', 'DIKELUARKAN', 'MENINGGAL');
CREATE TYPE "StatusAbsensi" AS ENUM ('HADIR', 'SAKIT', 'IZIN', 'ALPHA', 'DISPENSASI', 'TERLAMBAT', 'PULANG_CEPAT', 'DINAS', 'LAINNYA');
CREATE TYPE "StatusPeringatan" AS ENUM ('NORMAL', 'WARNING', 'SP1', 'SP2', 'PANGGILAN_ORTU', 'REKOMENDASI_BK');
CREATE TYPE "JenisSesi" AS ENUM ('PAGI', 'SIANG');
CREATE TYPE "TipeLaporan" AS ENUM ('HARIAN', 'MINGGUAN', 'BULANAN', 'SEMESTER', 'TAHUNAN');
CREATE TYPE "StatusSurat" AS ENUM ('DRAFT', 'TERBIT', 'TERKIRIM');

-- CreateTable tahun_ajaran
CREATE TABLE "tahun_ajaran" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "mulai" TIMESTAMP(3) NOT NULL,
    "selesai" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tahun_ajaran_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tahun_ajaran_nama_key" ON "tahun_ajaran"("nama");

-- CreateTable semester
CREATE TABLE "semester" (
    "id" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "mulai" TIMESTAMP(3) NOT NULL,
    "selesai" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "semester_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "semester_tahunAjaranId_urutan_key" ON "semester"("tahunAjaranId", "urutan");

-- CreateTable jurusan
CREATE TABLE "jurusan" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "singkatan" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jurusan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "jurusan_kode_key" ON "jurusan"("kode");

-- CreateTable guru
CREATE TABLE "guru" (
    "id" TEXT NOT NULL,
    "nip" TEXT,
    "nama" TEXT NOT NULL,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "email" TEXT,
    "telepon" TEXT,
    "alamat" TEXT,
    "foto" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guru_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "guru_nip_key" ON "guru"("nip");
CREATE UNIQUE INDEX "guru_email_key" ON "guru"("email");
CREATE UNIQUE INDEX "guru_userId_key" ON "guru"("userId");

-- CreateTable kelas
CREATE TABLE "kelas" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tingkat" INTEGER NOT NULL,
    "jurusanId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "waliKelasId" TEXT,
    "kapasitas" INTEGER NOT NULL DEFAULT 36,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kelas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kelas_nama_tahunAjaranId_key" ON "kelas"("nama", "tahunAjaranId");
CREATE INDEX "kelas_jurusanId_idx" ON "kelas"("jurusanId");
CREATE INDEX "kelas_tahunAjaranId_idx" ON "kelas"("tahunAjaranId");

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PETUGAS_PIKET',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateTable refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateTable siswa
CREATE TABLE "siswa" (
    "id" TEXT NOT NULL,
    "nis" TEXT NOT NULL,
    "nisn" TEXT,
    "nama" TEXT NOT NULL,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "tempatLahir" TEXT,
    "tanggalLahir" TIMESTAMP(3),
    "agama" TEXT,
    "alamat" TEXT,
    "telepon" TEXT,
    "namaOrtu" TEXT,
    "teleponOrtu" TEXT,
    "emailOrtu" TEXT,
    "foto" TEXT,
    "status" "StatusSiswa" NOT NULL DEFAULT 'AKTIF',
    "jurusanId" TEXT NOT NULL,
    "angkatan" INTEGER NOT NULL,
    "tanggalMasuk" TIMESTAMP(3),
    "tanggalKeluar" TIMESTAMP(3),
    "keteranganKeluar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "siswa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "siswa_nis_key" ON "siswa"("nis");
CREATE UNIQUE INDEX "siswa_nisn_key" ON "siswa"("nisn");
CREATE INDEX "siswa_nis_idx" ON "siswa"("nis");
CREATE INDEX "siswa_nama_idx" ON "siswa"("nama");
CREATE INDEX "siswa_status_idx" ON "siswa"("status");

-- CreateTable siswa_kelas
CREATE TABLE "siswa_kelas" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL,
    "selesai" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "siswa_kelas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "siswa_kelas_siswaId_kelasId_key" ON "siswa_kelas"("siswaId", "kelasId");
CREATE INDEX "siswa_kelas_siswaId_idx" ON "siswa_kelas"("siswaId");
CREATE INDEX "siswa_kelas_kelasId_idx" ON "siswa_kelas"("kelasId");

-- CreateTable jenis_kehadiran
CREATE TABLE "jenis_kehadiran" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "warna" TEXT NOT NULL DEFAULT '#3B82F6',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jenis_kehadiran_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "jenis_kehadiran_kode_key" ON "jenis_kehadiran"("kode");

-- CreateTable absensi
CREATE TABLE "absensi" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "StatusAbsensi" NOT NULL DEFAULT 'HADIR',
    "sesi" "JenisSesi" NOT NULL DEFAULT 'PAGI',
    "keterangan" TEXT,
    "lampiranUrl" TEXT,
    "menit" INTEGER,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "absensi_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "absensi_siswaId_tanggal_sesi_key" ON "absensi"("siswaId", "tanggal", "sesi");
CREATE INDEX "absensi_siswaId_idx" ON "absensi"("siswaId");
CREATE INDEX "absensi_kelasId_idx" ON "absensi"("kelasId");
CREATE INDEX "absensi_tanggal_idx" ON "absensi"("tanggal");
CREATE INDEX "absensi_status_idx" ON "absensi"("status");
CREATE INDEX "absensi_semesterId_idx" ON "absensi"("semesterId");

-- CreateTable jenis_pelanggaran
CREATE TABLE "jenis_pelanggaran" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "poin" INTEGER NOT NULL DEFAULT 5,
    "kategori" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jenis_pelanggaran_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "jenis_pelanggaran_kode_key" ON "jenis_pelanggaran"("kode");

-- CreateTable pelanggaran
CREATE TABLE "pelanggaran" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "jenisPelanggaranId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "poin" INTEGER NOT NULL,
    "keterangan" TEXT,
    "lampiranUrl" TEXT,
    "ditanganiOleh" TEXT,
    "tindakan" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pelanggaran_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pelanggaran_siswaId_idx" ON "pelanggaran"("siswaId");
CREATE INDEX "pelanggaran_kelasId_idx" ON "pelanggaran"("kelasId");
CREATE INDEX "pelanggaran_tanggal_idx" ON "pelanggaran"("tanggal");

-- CreateTable akumulasi_poin
CREATE TABLE "akumulasi_poin" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "totalPoin" INTEGER NOT NULL DEFAULT 0,
    "statusPeringatan" "StatusPeringatan" NOT NULL DEFAULT 'NORMAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "akumulasi_poin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "akumulasi_poin_siswaId_key" ON "akumulasi_poin"("siswaId");

-- CreateTable surat
CREATE TABLE "surat" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "perihal" TEXT NOT NULL,
    "isi" TEXT,
    "status" "StatusSurat" NOT NULL DEFAULT 'DRAFT',
    "totalPoin" INTEGER NOT NULL,
    "fileUrl" TEXT,
    "diterbitkanOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "surat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "surat_nomor_key" ON "surat"("nomor");
CREATE INDEX "surat_siswaId_idx" ON "surat"("siswaId");
CREATE INDEX "surat_tanggal_idx" ON "surat"("tanggal");

-- CreateTable event_sekolah
CREATE TABLE "event_sekolah" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "deskripsi" TEXT,
    "lokasi" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_sekolah_pkey" PRIMARY KEY ("id")
);

-- CreateTable qr_tokens
CREATE TABLE "qr_tokens" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "eventId" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "qr_tokens_token_key" ON "qr_tokens"("token");
CREATE INDEX "qr_tokens_token_idx" ON "qr_tokens"("token");

-- CreateTable hari_libur
CREATE TABLE "hari_libur" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'nasional',
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hari_libur_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hari_libur_tanggal_nama_key" ON "hari_libur"("tanggal", "nama");
CREATE INDEX "hari_libur_tanggal_idx" ON "hari_libur"("tanggal");

-- CreateTable kalender_akademik
CREATE TABLE "kalender_akademik" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE,
    "warna" TEXT NOT NULL DEFAULT '#3B82F6',
    "jenis" TEXT NOT NULL DEFAULT 'kegiatan',
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kalender_akademik_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kalender_akademik_tanggalMulai_idx" ON "kalender_akademik"("tanggalMulai");

-- CreateTable laporan
CREATE TABLE "laporan" (
    "id" TEXT NOT NULL,
    "jenis" "TipeLaporan" NOT NULL,
    "semesterId" TEXT,
    "kelasId" TEXT,
    "jurusanId" TEXT,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "judul" TEXT NOT NULL,
    "fileUrl" TEXT,
    "parameter" JSONB,
    "dibuatOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "laporan_pkey" PRIMARY KEY ("id")
);

-- CreateTable notifikasi
CREATE TABLE "notifikasi" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "tipe" TEXT NOT NULL DEFAULT 'info',
    "targetId" TEXT,
    "targetType" TEXT,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifikasi_targetId_idx" ON "notifikasi"("targetId");
CREATE INDEX "notifikasi_dibaca_idx" ON "notifikasi"("dibaca");

-- CreateTable audit_log
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "aksi" TEXT NOT NULL,
    "tabel" TEXT NOT NULL,
    "dataId" TEXT,
    "dataBefore" JSONB,
    "dataAfter" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");
CREATE INDEX "audit_log_tabel_idx" ON "audit_log"("tabel");
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateTable petugas_piket
CREATE TABLE "petugas_piket" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "hari" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "petugas_piket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "petugas_piket_guruId_hari_key" ON "petugas_piket"("guruId", "hari");

-- CreateTable rekap_absensi_harian
CREATE TABLE "rekap_absensi_harian" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "kelasId" TEXT NOT NULL,
    "hadir" INTEGER NOT NULL DEFAULT 0,
    "sakit" INTEGER NOT NULL DEFAULT 0,
    "izin" INTEGER NOT NULL DEFAULT 0,
    "alpha" INTEGER NOT NULL DEFAULT 0,
    "dispensasi" INTEGER NOT NULL DEFAULT 0,
    "terlambat" INTEGER NOT NULL DEFAULT 0,
    "pulangCepat" INTEGER NOT NULL DEFAULT 0,
    "dinas" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rekap_absensi_harian_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rekap_absensi_harian_tanggal_kelasId_key" ON "rekap_absensi_harian"("tanggal", "kelasId");
CREATE INDEX "rekap_absensi_harian_tanggal_idx" ON "rekap_absensi_harian"("tanggal");

-- AddForeignKeys
ALTER TABLE "semester" ADD CONSTRAINT "semester_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "tahun_ajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guru" ADD CONSTRAINT "guru_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "jurusan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "tahun_ajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_waliKelasId_fkey" FOREIGN KEY ("waliKelasId") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "jurusan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "siswa_kelas" ADD CONSTRAINT "siswa_kelas_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "siswa_kelas" ADD CONSTRAINT "siswa_kelas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pelanggaran" ADD CONSTRAINT "pelanggaran_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pelanggaran" ADD CONSTRAINT "pelanggaran_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pelanggaran" ADD CONSTRAINT "pelanggaran_jenisPelanggaranId_fkey" FOREIGN KEY ("jenisPelanggaranId") REFERENCES "jenis_pelanggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "akumulasi_poin" ADD CONSTRAINT "akumulasi_poin_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "surat" ADD CONSTRAINT "surat_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event_sekolah"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "laporan" ADD CONSTRAINT "laporan_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Triggers untuk update akumulasi poin otomatis
CREATE OR REPLACE FUNCTION update_akumulasi_poin_trigger()
RETURNS TRIGGER AS $$
DECLARE v_siswaId TEXT; v_total INT; v_status TEXT;
BEGIN
    v_siswaId := COALESCE(NEW."siswaId", OLD."siswaId");
    SELECT COALESCE(SUM(poin), 0) INTO v_total FROM pelanggaran WHERE "siswaId" = v_siswaId;
    IF v_total >= 150 THEN v_status := 'REKOMENDASI_BK';
    ELSIF v_total >= 100 THEN v_status := 'PANGGILAN_ORTU';
    ELSIF v_total >= 75 THEN v_status := 'SP2';
    ELSIF v_total >= 50 THEN v_status := 'SP1';
    ELSIF v_total >= 25 THEN v_status := 'WARNING';
    ELSE v_status := 'NORMAL';
    END IF;
    INSERT INTO akumulasi_poin ("id","siswaId","totalPoin","statusPeringatan","updatedAt")
    VALUES (gen_random_uuid(), v_siswaId, v_total, v_status::"StatusPeringatan", NOW())
    ON CONFLICT ("siswaId") DO UPDATE SET "totalPoin" = v_total, "statusPeringatan" = v_status::"StatusPeringatan", "updatedAt" = NOW();
    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_akumulasi_poin_insert AFTER INSERT ON pelanggaran FOR EACH ROW EXECUTE FUNCTION update_akumulasi_poin_trigger();
CREATE TRIGGER trg_akumulasi_poin_update AFTER UPDATE ON pelanggaran FOR EACH ROW EXECUTE FUNCTION update_akumulasi_poin_trigger();
CREATE TRIGGER trg_akumulasi_poin_delete AFTER DELETE ON pelanggaran FOR EACH ROW EXECUTE FUNCTION update_akumulasi_poin_trigger();
