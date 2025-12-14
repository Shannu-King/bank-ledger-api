const { Pool } = require('pg');
require('dotenv').config();

// Database Connection (To inject the initial money)
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runTest() {
    console.log("\n--- 🧪 STARTING SYSTEM VERIFICATION ---\n");

    try {
        // 1. Create Alice
        console.log("👤 Step 1: Creating User 'Alice'...");
        const resA = await fetch('http://localhost:3000/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'u_alice', name: 'Alice', type: 'checking' })
        });
        const alice = await resA.json();
        if (!alice.id) throw new Error("Failed to create Alice");
        console.log(`   ✅ Alice Created! ID: ${alice.id}`);

        // 2. Create Bob
        console.log("\n👤 Step 2: Creating User 'Bob'...");
        const resB = await fetch('http://localhost:3000/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'u_bob', name: 'Bob', type: 'savings' })
        });
        const bob = await resB.json();
        if (!bob.id) throw new Error("Failed to create Bob");
        console.log(`   ✅ Bob Created!   ID: ${bob.id}`);

        // 3. Inject Initial Money (Simulating a Cash Deposit)
        console.log("\n💰 Step 3: Injecting $1,000 into Alice's Account (Database Direct)...");
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Create a 'Deposit' transaction record
            const transRes = await client.query("INSERT INTO transactions (type, status, description) VALUES ('deposit', 'completed', 'Initial Cash Load') RETURNING id");
            const transId = transRes.rows[0].id;
            // Add Credit to Alice (No debit needed for cash deposit simulation)
            await client.query("INSERT INTO ledger_entries (transaction_id, account_id, type, amount) VALUES ($1, $2, 'credit', 1000.00)", [transId, alice.id]);
            await client.query('COMMIT');
            console.log("   ✅ Deposit Successful! Alice now has funds.");
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        // 4. Execute Transfer (The Real Test)
        console.log("\n💸 Step 4: API Test - Transferring $300.00 from Alice to Bob...");
        const transRes = await fetch('http://localhost:3000/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromAccountId: alice.id,
                toAccountId: bob.id,
                amount: 300.00,
                description: "Test Transfer Payment"
            })
        });
        const transData = await transRes.json();
        
        if (transRes.status === 200) {
            console.log("   ✅ Transfer API Success:", transData);
        } else {
            console.log("   ❌ Transfer Failed:", transData);
        }

        // 5. Verify Final Balances
        console.log("\n⚖️  Step 5: Verifying Ledger Integrity...");
        
        const balA = await fetch(`http://localhost:3000/api/accounts/${alice.id}`).then(r => r.json());
        const balB = await fetch(`http://localhost:3000/api/accounts/${bob.id}`).then(r => r.json());

        console.log(`   Alice Expected: $700.00 | Actual: $${balA.balance}`);
        console.log(`   Bob   Expected: $300.00 | Actual: $${balB.balance}`);

        if (balA.balance === 700 && balB.balance === 300) {
            console.log("\n🏆 SYSTEM STATUS: PASSED (Double-Entry Logic is Perfect)");
        } else {
            console.log("\n⚠️ SYSTEM STATUS: FAILED (Math Mismatch)");
        }

    } catch (err) {
        console.error("\n❌ TEST FAILED WITH ERROR:", err);
    } finally {
        pool.end();
    }
}

runTest();