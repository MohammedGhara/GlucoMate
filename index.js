// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./src/config/database');
const { maybeAttachUser, requireRole } = require('./src/middle/authz');
const { ensureAdminUser, openAdminPage } = require('./src/bootstrapAdmin');

// register models once so Sequelize knows about them
require('./src/models/donation');
require('./src/models/inventory');
require('./src/models/user');
require('./src/models/log');

// routes
const donationRoutes   = require('./src/routes/donations');
const inventoryRoutes  = require('./src/routes/inventory');
const authRoutes       = require('./src/routes/auth');
const issueRoutes      = require('./src/routes/issue');
const emergencyRoutes  = require('./src/routes/emergency');
const adminUsersRoutes = require('./src/routes/admin.users');

// 🔹 NEW: readings + test-email routes
const readingsRoutes   = require('./src/routes/readings');     // <-- add this file below
const testEmailRoutes  = require('./src/routes/testEmail');    // <-- add this file below

// swagger
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./src/docs/swagger.yaml');

const app = express();

// CORS: allow your Vite dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: false
}));

app.use(express.json());

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// ⚠️ Your client is calling /api/auth/* → keep both mounts to be safe:
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// attach user (if token/cookie provided) for everything after this
app.use(maybeAttachUser);

// admin-only routes
app.use('/admin/logs', requireRole('admin'), require('./src/routes/admin.logs'));
app.use('/admin/users', requireRole('admin'), adminUsersRoutes);

// existing business routes
app.use('/donations', donationRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/issue', issueRoutes);
app.use('/emergency', emergencyRoutes);

// 🔹 Mount new routes
app.use('/readings', readingsRoutes);  // client calls /readings
app.use('/api', testEmailRoutes);      // /api/test-email

// swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// init
(async () => {
  await sequelize.query('PRAGMA journal_mode = WAL;');
  await sequelize.query('PRAGMA busy_timeout = 5000;');

  await sequelize.sync();
  await ensureAdminUser();

  const Inventory = require('./src/models/inventory');
  for (const t of ['A+','A-','B+','B-','AB+','AB-','O+','O-']) {
    await Inventory.findOrCreate({ where: { bloodType: t }, defaults: { units: 0 } });
  }

  const port = process.env.PORT || 5000; // 🔹 use 5000 to match your frontend config
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Swagger UI:   http://localhost:${port}/api-docs`);
    openAdminPage(port);
  });
})();
