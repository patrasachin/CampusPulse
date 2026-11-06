require('dotenv').config();
const dns=require('dns');
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const seed = require('./seed');

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env.`);
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seed(); // adds sample data only if the database is empty
    app.listen(PORT, () => console.log(`CampusPulse running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
