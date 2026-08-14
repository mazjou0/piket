const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./config/swagger');
const { logger } = require('./utils/logger');
const { errorHandler } = require('./middlewares/errorHandler');
const { rateLimiter } = require('./middlewares/rateLimiter');
const webhookRoutes = require('./routes/webhook.routes');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const siswaRoutes = require('./routes/siswa.routes');
const guruRoutes = require('./routes/guru.routes');
const kelasRoutes = require('./routes/kelas.routes');
const jurusanRoutes = require('./routes/jurusan.routes');
const tahunAjaranRoutes = require('./routes/tahunAjaran.routes');
const semesterRoutes = require('./routes/semester.routes');
const absensiRoutes = require('./routes/absensi.routes');
const pelanggaranRoutes = require('./routes/pelanggaran.routes');
const laporanRoutes = require('./routes/laporan.routes');
const userRoutes = require('./routes/user.routes');
const hariLiburRoutes = require('./routes/hariLibur.routes');
const kalenderRoutes = require('./routes/kalender.routes');
const suratRoutes = require('./routes/surat.routes');
const qrRoutes = require('./routes/qr.routes');
const notifikasiRoutes = require('./routes/notifikasi.routes');
const uploadRoutes = require('./routes/upload.routes');
const auditRoutes = require('./routes/audit.routes');
const templateRoutes = require('./routes/template.routes');
const petugasPiketRoutes = require('./routes/petugasPiket.routes');
const pengaturanRoutes = require('./routes/pengaturan.routes');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Refresh-Token'] }));
app.use(compression());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) }, skip: (req) => req.url === '/health' }));

app.use('/auth', rateLimiter.auth);
app.use(rateLimiter.api);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/webhooks', webhookRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/siswa', siswaRoutes);
app.use('/guru', guruRoutes);
app.use('/kelas', kelasRoutes);
app.use('/jurusan', jurusanRoutes);
app.use('/tahun-ajaran', tahunAjaranRoutes);
app.use('/semester', semesterRoutes);
app.use('/absensi', absensiRoutes);
app.use('/pelanggaran', pelanggaranRoutes);
app.use('/laporan', laporanRoutes);
app.use('/users', userRoutes);
app.use('/hari-libur', hariLiburRoutes);
app.use('/kalender', kalenderRoutes);
app.use('/surat', suratRoutes);
app.use('/qr', qrRoutes);
app.use('/notifikasi', notifikasiRoutes);
app.use('/upload', uploadRoutes);
app.use('/audit', auditRoutes);
app.use('/master', templateRoutes);
app.use('/petugas-piket', petugasPiketRoutes);
app.use('/pengaturan', pengaturanRoutes);

app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use(errorHandler);

module.exports = app;
