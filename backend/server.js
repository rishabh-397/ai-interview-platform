require('./instrument.js');
require('dotenv').config();
const cluster = require('cluster');
const os = require('os');

// --- Day 44 fix: cluster mode ---
// The load test showed login (bcrypt.compare) blocking the event loop under concurrent
// requests, since Node runs on a single thread. Clustering forks one worker process per
// CPU core; the OS load-balances incoming connections across them, so CPU-heavy work like
// password hashing no longer queues up behind a single thread.
// Set CLUSTER_MODE=off in .env to disable this (useful for simpler local debugging).
const CLUSTER_ENABLED = process.env.CLUSTER_MODE !== 'off';
const WORKER_COUNT = Math.min(4, os.cpus().length); // capped at 4 to stay reasonable in Docker

if (CLUSTER_ENABLED && cluster.isPrimary) {
  console.log(`Primary ${process.pid} starting ${WORKER_COUNT} workers...`);
  for (let i = 0; i < WORKER_COUNT; i++) cluster.fork();

  cluster.on('exit', (worker, code) => {
    console.log(`Worker ${worker.process.pid} died (code ${code}) — restarting`);
    cluster.fork();
  });
} else {
  startServer();
}

async function startServer() {
  const express = require('express');
  const http = require('http');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const { Server } = require('socket.io');
  const { createAdapter } = require('@socket.io/redis-adapter');
  const { createClient } = require('redis');
  const Sentry = require('@sentry/node');

  const authRoutes = require('./routes/authRoutes');
  const interviewRoutes = require('./routes/interviewRoutes');
  const dashboardRoutes = require('./routes/dashboardRoutes');
  const startReminderCron = require('./services/reminderCron');
  const chatbotRoutes = require('./routes/chatbotRoutes');
  const resumeRoutes = require('./routes/resumeRoutes');
  const badgeRoutes = require('./routes/badgeRoutes');
  const scheduleRoutes = require('./routes/scheduleRoutes');
  const codeExecutionRoutes = require('./routes/codeExecutionRoutes');
  const companyRoutes = require('./routes/companyRoutes');
  const apiKeyRoutes = require('./routes/apiKeyRoutes');
  const publicApiRoutes = require('./routes/publicApiRoutes');
  const webhookRoutes = require('./routes/webhookRoutes');
  const questionBankRoutes = require('./routes/questionBankRoutes');
  const userRoutes = require('./routes/userRoutes');
  const errorHandler = require('./middleware/errorHandler');
  const registerInterviewSocket = require('./sockets/interviewSocket');

  const app = express();
  const server = http.createServer(app);

  const allowedOrigins = [
    'http://localhost:5173',
    'https://ai-interview-platform-six-kohl.vercel.app',
    'https://ai-interview-platform-furq44ygv-rishabh-397s-projects.vercel.app',
    'https://ai-interview-platform-qqp1bqpx3-rishabh-397s-projects.vercel.app'
  ];

  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Redis adapter: without this, a socket event emitted from the worker handling User A's
  // connection would never reach User B if they landed on a different worker process.
  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  app.use(helmet());

  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.use('/api/auth', authRoutes);
  app.use('/api/interview', interviewRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/chatbot', chatbotRoutes);
  app.use('/api/resume', resumeRoutes);
  app.use('/api/badges', badgeRoutes);
  app.use('/api/schedule', scheduleRoutes);
  app.use('/api/code', codeExecutionRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/api-keys', apiKeyRoutes);
  app.use('/api/public', publicApiRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/question-bank', questionBankRoutes);
  app.use('/api/user', userRoutes);

  app.get('/health', (req, res) =>
    res.json({ status: 'ok', timestamp: new Date(), worker: process.pid })
  );

  registerInterviewSocket(io);

  if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;
  startReminderCron();
  server.listen(PORT, () =>
    console.log(`Worker ${process.pid} running on port ${PORT}`)
  );
}