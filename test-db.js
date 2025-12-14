require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkConnection() {
    try {
        console.log("Attempting to connect...");
        const client = await pool.connect();
        console.log("✅ Connected to Database!");
        
        const res = await client.query('SELECT NOW()');
        console.log("🕒 Database Time:", res.rows[0].now);
        
        client.release();
        pool.end();
    } catch (err) {
        console.error("❌ Connection Failed!", err);
    }
}

checkConnection();