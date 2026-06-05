const express = require('express');
const { connectDB } = require('./config/db');

const app = express();

app.get('/', async (req, res) => {
    try {

        const pool = await connectDB();

        const result = await pool
            .request()
            .query('SELECT * FROM Categories');

        res.json(result.recordset);

    } catch (err) {

        res.status(500).send(err.message);

    }
});

app.listen(3000, () => {
    console.log('Сервер запущен');
});