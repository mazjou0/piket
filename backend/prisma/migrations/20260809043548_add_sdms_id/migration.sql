/*
  Warnings:

  - A unique constraint covering the columns `[sdms_id]` on the table `guru` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sdms_id]` on the table `siswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sdms_id]` on the table `siswa_kelas` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "guru" ADD COLUMN     "sdms_id" TEXT;

-- AlterTable
ALTER TABLE "siswa" ADD COLUMN     "sdms_id" TEXT;

-- AlterTable
ALTER TABLE "siswa_kelas" ADD COLUMN     "sdms_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "guru_sdms_id_key" ON "guru"("sdms_id");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_sdms_id_key" ON "siswa"("sdms_id");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_kelas_sdms_id_key" ON "siswa_kelas"("sdms_id");
