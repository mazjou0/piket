-- Initial PostgreSQL setup for SIPAKAR
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Function: Update akumulasi poin otomatis setelah insert/update/delete pelanggaran
CREATE OR REPLACE FUNCTION update_akumulasi_poin()
RETURNS TRIGGER AS $$
DECLARE
    total_poin INT;
    status_baru TEXT;
BEGIN
    -- Hitung total poin
    SELECT COALESCE(SUM(poin), 0) INTO total_poin
    FROM pelanggaran
    WHERE "siswaId" = COALESCE(NEW."siswaId", OLD."siswaId");

    -- Tentukan status peringatan
    IF total_poin >= 150 THEN
        status_baru := 'REKOMENDASI_BK';
    ELSIF total_poin >= 100 THEN
        status_baru := 'PANGGILAN_ORTU';
    ELSIF total_poin >= 75 THEN
        status_baru := 'SP2';
    ELSIF total_poin >= 50 THEN
        status_baru := 'SP1';
    ELSIF total_poin >= 25 THEN
        status_baru := 'WARNING';
    ELSE
        status_baru := 'NORMAL';
    END IF;

    -- Upsert akumulasi poin
    INSERT INTO akumulasi_poin ("id", "siswaId", "totalPoin", "statusPeringatan", "updatedAt")
    VALUES (gen_random_uuid(), COALESCE(NEW."siswaId", OLD."siswaId"), total_poin, status_baru::text::"StatusPeringatan", NOW())
    ON CONFLICT ("siswaId")
    DO UPDATE SET "totalPoin" = total_poin, "statusPeringatan" = status_baru::text::"StatusPeringatan", "updatedAt" = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function: Trigger rekap harian
CREATE OR REPLACE FUNCTION update_rekap_harian()
RETURNS TRIGGER AS $$
DECLARE
    tgl DATE;
    kls TEXT;
BEGIN
    tgl := COALESCE(NEW.tanggal, OLD.tanggal);
    kls := COALESCE(NEW."kelasId", OLD."kelasId");

    INSERT INTO rekap_absensi_harian (
        "id", "tanggal", "kelasId",
        "hadir", "sakit", "izin", "alpha", "dispensasi",
        "terlambat", "pulangCepat", "dinas", "total", "updatedAt"
    )
    SELECT
        gen_random_uuid(),
        tgl,
        kls,
        COUNT(*) FILTER (WHERE status = 'HADIR'),
        COUNT(*) FILTER (WHERE status = 'SAKIT'),
        COUNT(*) FILTER (WHERE status = 'IZIN'),
        COUNT(*) FILTER (WHERE status = 'ALPHA'),
        COUNT(*) FILTER (WHERE status = 'DISPENSASI'),
        COUNT(*) FILTER (WHERE status = 'TERLAMBAT'),
        COUNT(*) FILTER (WHERE status = 'PULANG_CEPAT'),
        COUNT(*) FILTER (WHERE status = 'DINAS'),
        COUNT(*),
        NOW()
    FROM absensi
    WHERE tanggal = tgl AND "kelasId" = kls
    ON CONFLICT ("tanggal", "kelasId")
    DO UPDATE SET
        "hadir" = EXCLUDED."hadir",
        "sakit" = EXCLUDED."sakit",
        "izin" = EXCLUDED."izin",
        "alpha" = EXCLUDED."alpha",
        "dispensasi" = EXCLUDED."dispensasi",
        "terlambat" = EXCLUDED."terlambat",
        "pulangCepat" = EXCLUDED."pulangCepat",
        "dinas" = EXCLUDED."dinas",
        "total" = EXCLUDED."total",
        "updatedAt" = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
