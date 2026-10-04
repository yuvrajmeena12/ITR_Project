const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const config = require('./config');
const connectDB = require('./config/db');

const {
  rejectOperators,
  sameOrigin,
  isAllowedOrigin,
  notFoundHandler,
  errorHandler
} = require('./middleware/security');

function createApp() {
  const app = express();

  app.disable('x-powered-by');

  if (process.env.TRUST_PROXY) {
    app.set(
      'trust proxy',
      Number(process.env.TRUST_PROXY) || 1
    );
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"]
        }
      },
      crossOriginResourcePolicy: {
        policy: 'same-site'
      }
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests without an Origin header
        // such as health checks and server-to-server requests.
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (req.body === undefined) {
      req.body = {};
    }
    next();
  });

  // API security middleware
  app.use('/api', sameOrigin, rejectOperators);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'up' : 'down'
    });
  });

  // API routes
  app.use('/api/public', require('./routes/publicRoutes'));
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/skills', require('./routes/skillRoutes'));
  app.use('/api/matches', require('./routes/matchRoutes'));
  app.use('/api/swaps', require('./routes/swapRoutes'));
  app.use('/api/sessions', require('./routes/sessionRoutes'));
  app.use('/api/reviews', require('./routes/reviewRoutes'));
  app.use('/api/messages', require('./routes/messageRoutes'));
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  app.use('/api/dashboard', require('./routes/dashboardRoutes'));

  // 404 and error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function start() {
  try {
    // Connect to MongoDB before starting the server
    await connectDB();

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(
        `SkillSwap API listening on port ${config.port}`
      );
    });

    const shutdown = () => {
      server.close(() => {
        mongoose.connection
          .close()
          .finally(() => process.exit(0));
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error(
      'Failed to start server:',
      err.message
    );

    process.exit(1);
  }
}

// Start server when running:
// node server.js
if (require.main === module) {
  start();
}

// Export for testing/reuse
module.exports = { createApp };