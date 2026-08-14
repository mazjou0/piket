-- AlterTable
ALTER TABLE "users" ADD COLUMN     "roles" "Role"[] DEFAULT ARRAY[]::"Role"[];

-- CreateIndex
CREATE INDEX "absensi_kelasId_tanggal_idx" ON "absensi"("kelasId", "tanggal");

-- CreateIndex
CREATE INDEX "absensi_kelasId_tanggal_sesi_idx" ON "absensi"("kelasId", "tanggal", "sesi");

-- CreateIndex
CREATE INDEX "absensi_siswaId_tanggal_idx" ON "absensi"("siswaId", "tanggal");

-- CreateIndex
CREATE INDEX "guru_nama_idx" ON "guru"("nama");

-- CreateIndex
CREATE INDEX "laporan_jenis_idx" ON "laporan"("jenis");

-- CreateIndex
CREATE INDEX "laporan_createdAt_idx" ON "laporan"("createdAt");

-- CreateIndex
CREATE INDEX "siswa_nisn_idx" ON "siswa"("nisn");

-- CreateIndex
CREATE INDEX "siswa_angkatan_idx" ON "siswa"("angkatan");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");
