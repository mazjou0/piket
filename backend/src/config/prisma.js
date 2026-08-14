const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

// Connection pool dikonfigurasi via DATABASE_URL di .env
// Tambahkan ?connection_limit=10&pool_timeout=20 ke DATABASE_URL jika perlu
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log slow query di semua environment
prisma.$on('query', (e) => {
  const threshold = process.env.NODE_ENV === 'development' ? 500 : 2000;
  if (e.duration > threshold) {
    logger.warn(`Slow query (${e.duration}ms)`);
  }
});

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

module.exports = prisma;
