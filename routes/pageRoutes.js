const express = require('express');
const router = express.Router();
const path = require('path');

// Главная страница (отдаёт HTML)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Страница входа
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Страница регистрации
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/register.html'));
});

// Страница создания объявления
router.get('/create-ad', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/create-ad.html'));
});

// API для проверки авторизации (для фронта)
router.get('/api/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Не авторизован' });
    }
});

// Выход
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;