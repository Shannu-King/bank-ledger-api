require('dotenv').config();
const express = require('express');
const app = express();
const apiRoutes = require('./src/routes/api');

// Middleware to parse JSON bodies (Critical for POST requests)
app.use(express.json());

// Mount the API routes
app.use('/api', apiRoutes);

// Simple health check
app.get('/', (req, res) => {
    res.send('Bank Ledger API is Running 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n--- SERVER STARTED ---`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`----------------------\n`);
});