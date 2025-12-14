const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debug() {
    try {
        console.log("--- 🕵️ DEBUGGING DATABASE ---");
        const client = await pool.connect();
        console.log("✅ DB Connected");

        // Try raw SQL insert to see the real error
        console.log("Attempting INSERT...");
        const text = `INSERT INTO accounts (user_id, name, type) VALUES ('u_test', 'Debug User', 'checking') RETURNING *`;
        
        const res = await client.query(text);
        console.log("✅ INSERT SUCCESS:", res.rows[0]);
        
        client.release();
    } catch (err) {
        console.error("\n❌ FATAL DB ERROR FOUND:");
        console.error("------------------------------------------------");
        console.error(err.message); // This is the line we need
        console.error("------------------------------------------------");
    } finally {
        pool.end();
    }
}

debug();