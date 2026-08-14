// SIPAKAR Database Seeder
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SIPAKAR database seeding...');

  // ============================================================
  // 1. TAHUN AJARAN & SEMESTER
  // ============================================================
  const tahunAjaran = await prisma.tahunAjaran.upsert({
    where: { nama: '2024/2025' },
    update: {},
    create: {
      nama: '2024/2025',
      aktif: true,
      mulai: new Date('2024-07-15'),
      selesai: new Date('2025-06-30'),
    },
  });
  console.log('✅ Tahun Ajaran created');

  const semesterGanjil = await prisma.semester.upsert({
    where: { tahunAjaranId_urutan: { tahunAjaranId: tahunAjaran.id, urutan: 1 } },
    update: {},
    create: {
      tahunAjaranId: tahunAjaran.id,
      nama: 'Ganjil',
      urutan: 1,
      aktif: true,
      mulai: new Date('2024-07-15'),
      selesai: new Date('2024-12-31'),
    },
  });

  const semesterGenap = await prisma.semester.upsert({
    where: { tahunAjaranId_urutan: { tahunAjaranId: tahunAjaran.id, urutan: 2 } },
    update: {},
    create: {
      tahunAjaranId: tahunAjaran.id,
      nama: 'Genap',
      urutan: 2,
      aktif: false,
      mulai: new Date('2025-01-06'),
      selesai: new Date('2025-06-30'),
    },
  });
  console.log('✅ Semester created');

  // ============================================================
  // 2. JURUSAN
  // ============================================================
  const jurusanData = [
    { kode: 'RPL', nama: 'Rekayasa Perangkat Lunak', singkatan: 'RPL' },
    { kode: 'TKJ', nama: 'Teknik Komputer Jaringan', singkatan: 'TKJ' },
    { kode: 'MM', nama: 'Multimedia', singkatan: 'MM' },
    { kode: 'AK', nama: 'Akuntansi dan Keuangan Lembaga', singkatan: 'AK' },
    { kode: 'OTKP', nama: 'Otomatisasi Tata Kelola Perkantoran', singkatan: 'OTKP' },
    { kode: 'BDP', nama: 'Bisnis Daring dan Pemasaran', singkatan: 'BDP' },
    { kode: 'TBSM', nama: 'Teknik Bisnis Sepeda Motor', singkatan: 'TBSM' },
  ];

  const jurusanMap = {};
  for (const j of jurusanData) {
    const jurusan = await prisma.jurusan.upsert({
      where: { kode: j.kode },
      update: {},
      create: j,
    });
    jurusanMap[j.kode] = jurusan;
  }
  console.log('✅ Jurusan created');

  // ============================================================
  // 3. USERS - Super Admin & Admin
  // ============================================================
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  const superAdminUser = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'superadmin@smkn1kras.sch.id',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      aktif: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@smkn1kras.sch.id',
      password: hashedPassword,
      role: 'ADMIN',
      aktif: true,
    },
  });

  const bkUser = await prisma.user.upsert({
    where: { username: 'bk.konselor' },
    update: {},
    create: {
      username: 'bk.konselor',
      email: 'bk@smkn1kras.sch.id',
      password: hashedPassword,
      role: 'BK',
      aktif: true,
    },
  });

  const kepalaUser = await prisma.user.upsert({
    where: { username: 'kepsek' },
    update: {},
    create: {
      username: 'kepsek',
      email: 'kepsek@smkn1kras.sch.id',
      password: hashedPassword,
      role: 'KEPALA_SEKOLAH',
      aktif: true,
    },
  });
  console.log('✅ Users created');

  // ============================================================
  // 4. GURU
  // ============================================================
  const guruData = [
    { nip: '197001011990031001', nama: 'Drs. Ahmad Supriadi, M.Pd', jenisKelamin: 'L', email: 'ahmad.supriadi@smkn1kras.sch.id', telepon: '081234567890' },
    { nip: '197505152000122001', nama: 'Siti Rahayu, S.Pd', jenisKelamin: 'P', email: 'siti.rahayu@smkn1kras.sch.id', telepon: '081234567891' },
    { nip: '198003202005011002', nama: 'Budi Santoso, S.Kom', jenisKelamin: 'L', email: 'budi.santoso@smkn1kras.sch.id', telepon: '081234567892' },
    { nip: '198507142008012003', nama: 'Dewi Kusuma, S.T', jenisKelamin: 'P', email: 'dewi.kusuma@smkn1kras.sch.id', telepon: '081234567893' },
    { nip: '199001202015031004', nama: 'Eko Prasetyo, S.Pd', jenisKelamin: 'L', email: 'eko.prasetyo@smkn1kras.sch.id', telepon: '081234567894' },
    { nip: '199205102017042005', nama: 'Fitri Andayani, S.Pd', jenisKelamin: 'P', email: 'fitri.andayani@smkn1kras.sch.id', telepon: '081234567895' },
    { nip: '198812012010011006', nama: 'Gunawan Wibowo, S.Pd', jenisKelamin: 'L', email: 'gunawan.wibowo@smkn1kras.sch.id', telepon: '081234567896' },
    { nip: '199310222018032007', nama: 'Hana Pertiwi, S.Kom', jenisKelamin: 'P', email: 'hana.pertiwi@smkn1kras.sch.id', telepon: '081234567897' },
  ];

  const guruMap = {};
  for (const g of guruData) {
    const guru = await prisma.guru.upsert({
      where: { nip: g.nip },
      update: {},
      create: {
        ...g,
        jenisKelamin: g.jenisKelamin,
        aktif: true,
      },
    });
    guruMap[g.nip] = guru;
  }
  console.log('✅ Guru created');

  // ============================================================
  // 5. KELAS
  // ============================================================
  const kelasData = [];
  const tingkatan = [10, 11, 12];
  const jurusanList = Object.values(jurusanMap);

  for (const tingkat of tingkatan) {
    for (const jurusan of jurusanList.slice(0, 4)) { // 4 jurusan, 2 kelas each
      for (let i = 1; i <= 2; i++) {
        kelasData.push({
          nama: `${tingkat === 10 ? 'X' : tingkat === 11 ? 'XI' : 'XII'} ${jurusan.singkatan} ${i}`,
          tingkat,
          jurusanId: jurusan.id,
          tahunAjaranId: tahunAjaran.id,
          kapasitas: 36,
        });
      }
    }
  }

  const kelasMap = {};
  const guruList = Object.values(guruMap);
  for (let i = 0; i < kelasData.length; i++) {
    const k = kelasData[i];
    const existing = await prisma.kelas.findFirst({
      where: { nama: k.nama, tahunAjaranId: k.tahunAjaranId },
    });
    const kelas = existing || await prisma.kelas.create({
      data: {
        ...k,
        waliKelasId: guruList[i % guruList.length]?.id,
      },
    });
    kelasMap[k.nama] = kelas;
  }
  console.log('✅ Kelas created');

  // ============================================================
  // 6. SISWA & SISWA_KELAS
  // ============================================================
  const namaLaki = ['Ahmad', 'Budi', 'Cahyo', 'Deni', 'Eko', 'Fajar', 'Gilang', 'Hendra', 'Imam', 'Joko', 'Kevin', 'Lukman', 'Muhammad', 'Nanda', 'Oki', 'Putra', 'Rama', 'Sigit', 'Taufik', 'Umar'];
  const namaPerempuan = ['Aini', 'Bella', 'Citra', 'Dina', 'Eka', 'Fira', 'Galuh', 'Hesti', 'Indah', 'Julia', 'Kirana', 'Lestari', 'Maya', 'Nisa', 'Okta', 'Putri', 'Ratna', 'Sari', 'Tina', 'Ulfa'];
  const namaDepan = [...namaLaki, ...namaPerempuan];

  let nisCounter = 20220001;
  const siswaList = [];

  const kelasX = Object.entries(kelasMap).filter(([nama]) => nama.startsWith('X ') && !nama.startsWith('XI') && !nama.startsWith('XII'));

  for (const [kelasNama, kelas] of kelasX) {
    for (let i = 0; i < 30; i++) {
      const isLaki = i % 3 !== 0;
      const namaSiswa = isLaki
        ? `${namaLaki[i % namaLaki.length]} ${namaLaki[(i + 5) % namaLaki.length]}`
        : `${namaPerempuan[i % namaPerempuan.length]} ${namaPerempuan[(i + 3) % namaPerempuan.length]}`;

      const nis = String(nisCounter++).padStart(8, '0');
      const siswa = await prisma.siswa.upsert({
        where: { nis },
        update: {},
        create: {
          nis,
          nisn: `00${nis}`,
          nama: namaSiswa,
          jenisKelamin: isLaki ? 'L' : 'P',
          jurusanId: kelas.jurusanId,
          angkatan: 2024,
          tanggalMasuk: new Date('2024-07-15'),
          namaOrtu: `Orang Tua ${namaSiswa}`,
          teleponOrtu: `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: 'AKTIF',
        },
      });

      // SiswaKelas
      await prisma.siswaKelas.upsert({
        where: { siswaId_kelasId: { siswaId: siswa.id, kelasId: kelas.id } },
        update: {},
        create: {
          siswaId: siswa.id,
          kelasId: kelas.id,
          mulai: new Date('2024-07-15'),
          aktif: true,
        },
      });

      siswaList.push({ ...siswa, kelasId: kelas.id });
    }
  }
  console.log(`✅ Siswa created: ${siswaList.length}`);

  // ============================================================
  // 7. JENIS KEHADIRAN
  // ============================================================
  const jenisKehadiranData = [
    { kode: 'H', nama: 'Hadir', warna: '#10B981' },
    { kode: 'S', nama: 'Sakit', warna: '#F59E0B' },
    { kode: 'I', nama: 'Izin', warna: '#3B82F6' },
    { kode: 'A', nama: 'Alpha', warna: '#EF4444' },
    { kode: 'D', nama: 'Dispensasi', warna: '#8B5CF6' },
    { kode: 'T', nama: 'Terlambat', warna: '#F97316' },
    { kode: 'PC', nama: 'Pulang Cepat', warna: '#EC4899' },
    { kode: 'DN', nama: 'Dinas', warna: '#06B6D4' },
    { kode: 'L', nama: 'Lainnya', warna: '#6B7280' },
  ];

  for (const jk of jenisKehadiranData) {
    await prisma.jenisKehadiran.upsert({
      where: { kode: jk.kode },
      update: {},
      create: jk,
    });
  }
  console.log('✅ Jenis Kehadiran created');

  // ============================================================
  // 8. JENIS PELANGGARAN
  // ============================================================
  const jenisPelanggaranData = [
    { kode: 'TLB', nama: 'Terlambat', poin: 5, kategori: 'ringan', deskripsi: 'Datang terlambat ke sekolah' },
    { kode: 'MBL', nama: 'Membolos', poin: 20, kategori: 'sedang', deskripsi: 'Tidak hadir tanpa keterangan' },
    { kode: 'MRK', nama: 'Merokok', poin: 25, kategori: 'berat', deskripsi: 'Merokok di lingkungan sekolah' },
    { kode: 'ATR', nama: 'Tidak Memakai Atribut', poin: 10, kategori: 'ringan', deskripsi: 'Tidak lengkap atribut seragam' },
    { kode: 'RPJ', nama: 'Rambut Panjang', poin: 5, kategori: 'ringan', deskripsi: 'Rambut melebihi batas ketentuan' },
    { kode: 'BKL', nama: 'Berkelahi', poin: 50, kategori: 'berat', deskripsi: 'Terlibat perkelahian' },
    { kode: 'KLK', nama: 'Keluar Kelas', poin: 10, kategori: 'ringan', deskripsi: 'Keluar kelas tanpa izin' },
    { kode: 'HP', nama: 'HP di Kelas', poin: 15, kategori: 'sedang', deskripsi: 'Menggunakan HP saat pembelajaran' },
    { kode: 'UAT', nama: 'Tidak Berseragam', poin: 15, kategori: 'sedang', deskripsi: 'Tidak memakai seragam sesuai hari' },
    { kode: 'VNL', nama: 'Vandalisme', poin: 30, kategori: 'berat', deskripsi: 'Merusak fasilitas sekolah' },
    { kode: 'LAN', nama: 'Lainnya', poin: 10, kategori: 'sedang', deskripsi: 'Pelanggaran lainnya' },
  ];

  const jenisPelanggaranMap = {};
  for (const jp of jenisPelanggaranData) {
    const jenis = await prisma.jenisPelanggaran.upsert({
      where: { kode: jp.kode },
      update: {},
      create: jp,
    });
    jenisPelanggaranMap[jp.kode] = jenis;
  }
  console.log('✅ Jenis Pelanggaran created');

  // ============================================================
  // 9. SAMPLE ABSENSI (7 hari terakhir)
  // ============================================================
  const today = new Date();
  const statusList = ['HADIR', 'HADIR', 'HADIR', 'HADIR', 'HADIR', 'HADIR', 'HADIR', 'HADIR', 'HADIR', 'HADIR', 'SAKIT', 'IZIN', 'ALPHA', 'TERLAMBAT', 'DISPENSASI'];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const tanggal = new Date(today);
    tanggal.setDate(today.getDate() - dayOffset);
    const dayOfWeek = tanggal.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekend

    tanggal.setHours(0, 0, 0, 0);

    for (const siswa of siswaList.slice(0, 60)) { // sample 60 siswa
      const status = statusList[Math.floor(Math.random() * statusList.length)];
      try {
        await prisma.absensi.upsert({
          where: { siswaId_tanggal_sesi: { siswaId: siswa.id, tanggal, sesi: 'PAGI' } },
          update: {},
          create: {
            siswaId: siswa.id,
            kelasId: siswa.kelasId,
            semesterId: semesterGanjil.id,
            tanggal,
            status,
            sesi: 'PAGI',
            menit: status === 'TERLAMBAT' ? Math.floor(Math.random() * 30) + 5 : null,
          },
        });
      } catch (e) {
        // skip duplicate
      }
    }
  }
  console.log('✅ Sample Absensi created');

  // ============================================================
  // 10. SAMPLE PELANGGARAN
  // ============================================================
  const pelanggaranJenisIds = Object.values(jenisPelanggaranMap);

  for (const siswa of siswaList.slice(0, 20)) {
    const numPelanggaran = Math.floor(Math.random() * 4);
    for (let i = 0; i < numPelanggaran; i++) {
      const jenis = pelanggaranJenisIds[Math.floor(Math.random() * pelanggaranJenisIds.length)];
      const tanggalPlng = new Date(today);
      tanggalPlng.setDate(today.getDate() - Math.floor(Math.random() * 30));
      tanggalPlng.setHours(0, 0, 0, 0);

      try {
        await prisma.pelanggaran.create({
          data: {
            siswaId: siswa.id,
            kelasId: siswa.kelasId,
            jenisPelanggaranId: jenis.id,
            tanggal: tanggalPlng,
            poin: jenis.poin,
            keterangan: `${jenis.nama} - tercatat`,
          },
        });
      } catch (e) {
        // skip
      }
    }
  }
  console.log('✅ Sample Pelanggaran created');

  // ============================================================
  // 11. HARI LIBUR
  // ============================================================
  const hariLiburData = [
    { tanggal: new Date('2024-08-17'), nama: 'HUT Kemerdekaan RI' },
    { tanggal: new Date('2024-10-01'), nama: 'Hari Kesaktian Pancasila' },
    { tanggal: new Date('2024-11-10'), nama: 'Hari Pahlawan' },
    { tanggal: new Date('2024-12-25'), nama: 'Hari Natal' },
    { tanggal: new Date('2025-01-01'), nama: 'Tahun Baru Masehi' },
    { tanggal: new Date('2025-03-29'), nama: 'Hari Raya Nyepi' },
    { tanggal: new Date('2025-04-18'), nama: 'Wafat Isa Al Masih' },
    { tanggal: new Date('2025-05-01'), nama: 'Hari Buruh Internasional' },
    { tanggal: new Date('2025-05-29'), nama: 'Kenaikan Isa Al Masih' },
    { tanggal: new Date('2025-06-01'), nama: 'Hari Lahir Pancasila' },
  ];

  for (const hl of hariLiburData) {
    try {
      await prisma.hariLibur.upsert({
        where: { tanggal_nama: { tanggal: hl.tanggal, nama: hl.nama } },
        update: {},
        create: { ...hl, jenis: 'nasional' },
      });
    } catch (e) { /* skip */ }
  }
  console.log('✅ Hari Libur created');

  // ============================================================
  // 12. AKUMULASI POIN (Initialize for all siswa)
  // ============================================================
  for (const siswa of siswaList) {
    await prisma.akumulasiPoin.upsert({
      where: { siswaId: siswa.id },
      update: {},
      create: {
        siswaId: siswa.id,
        totalPoin: 0,
        statusPeringatan: 'NORMAL',
      },
    });
  }
  console.log('✅ Akumulasi Poin initialized');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('📋 Login Credentials:');
  console.log('   Super Admin: superadmin / Admin@123');
  console.log('   Admin      : admin / Admin@123');
  console.log('   BK         : bk.konselor / Admin@123');
  console.log('   Kepala Sek : kepsek / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
