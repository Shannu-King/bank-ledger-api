const db = require('../db');

// Helper to validate amounts (Must be string or number, positive)
const validateAmount = (amount) => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) throw new Error("Invalid amount");
    return val;
};

const createAccount = async (userId, name, type) => {
    const text = `
        INSERT INTO accounts (user_id, name, type) 
        VALUES ($1, $2, $3) 
        RETURNING *`;
    const res = await db.query(text, [userId, name, type]);
    return res.rows[0];
};

const getBalance = async (accountId) => {
    // SUM all ledger entries for this account
    // COALESCE returns 0 if there are no entries (null)
    const text = `SELECT COALESCE(SUM(amount), 0) as balance FROM ledger_entries WHERE account_id = $1`;
    const res = await db.query(text, [accountId]);
    return res.rows[0].balance;
};

const transferFunds = async (fromAccountId, toAccountId, amount, description) => {
    const client = await db.getClient(); // Get a dedicated client for transaction
    const safeAmount = validateAmount(amount);

    try {
        await client.query('BEGIN'); // 1. Start Transaction

        // 2. Create the Transaction Record
        const transRes = await client.query(
            `INSERT INTO transactions (type, description, status) VALUES ('transfer', $1, 'pending') RETURNING id`,
            [description]
        );
        const transactionId = transRes.rows[0].id;

        // 3. Create Debit Entry (Source Account) - NEGATIVE Amount
        await client.query(
            `INSERT INTO ledger_entries (transaction_id, account_id, type, amount) VALUES ($1, $2, 'debit', $3)`,
            [transactionId, fromAccountId, -safeAmount]
        );

        // 4. Create Credit Entry (Destination Account) - POSITIVE Amount
        await client.query(
            `INSERT INTO ledger_entries (transaction_id, account_id, type, amount) VALUES ($1, $2, 'credit', $3)`,
            [transactionId, toAccountId, safeAmount]
        );

        // 5. CHECK BALANCE (The Overdraft Guard)
        // We calculate the NEW balance inside the transaction.
        const balanceRes = await client.query(
            `SELECT SUM(amount) as balance FROM ledger_entries WHERE account_id = $1`,
            [fromAccountId]
        );
        const newBalance = parseFloat(balanceRes.rows[0].balance);

        if (newBalance < 0) {
            throw new Error(`Insufficient funds. Resulting balance would be ${newBalance}`);
        }

        // 6. Update Transaction Status to Completed
        await client.query(
            `UPDATE transactions SET status = 'completed' WHERE id = $1`,
            [transactionId]
        );

        await client.query('COMMIT'); // 7. Save everything
        return { transactionId, status: 'completed', amount: safeAmount };

    } catch (e) {
        await client.query('ROLLBACK'); // 8. Undo everything if error
        console.error("Transaction Failed:", e.message);
        throw e; // Re-throw to let the API know it failed
    } finally {
        client.release(); // Release connection back to pool
    }
};

module.exports = { createAccount, getBalance, transferFunds };