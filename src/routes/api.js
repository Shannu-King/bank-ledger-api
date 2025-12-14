const express = require('express');
const router = express.Router();
const ledgerService = require('../services/ledgerService');

// 1. Create Account Endpoint
router.post('/accounts', async (req, res) => {
    try {
        const { userId, name, type } = req.body;
        if (!userId || !name || !type) {
            return res.status(400).json({ error: "Missing required fields: userId, name, type" });
        }
        const account = await ledgerService.createAccount(userId, name, type);
        res.status(201).json(account);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Balance Endpoint
router.get('/accounts/:id', async (req, res) => {
    try {
        const balance = await ledgerService.getBalance(req.params.id);
        res.json({ accountId: req.params.id, balance: parseFloat(balance) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Transfer Endpoint (The Core Feature)
router.post('/transfer', async (req, res) => {
    try {
        const { fromAccountId, toAccountId, amount, description } = req.body;
        
        // Basic Validation
        if (!fromAccountId || !toAccountId || !amount) {
            return res.status(400).json({ error: "Missing fields: fromAccountId, toAccountId, amount" });
        }

        const result = await ledgerService.transferFunds(fromAccountId, toAccountId, amount, description);
        res.status(200).json(result);

    } catch (err) {
        // If it's an "Insufficient funds" error (logic error), send 400. Otherwise 500.
        if (err.message.includes("Insufficient funds")) {
            res.status(400).json({ error: err.message });
        } else {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

module.exports = router;