const express = require('express');
const session = require('express-session');
const path = require('path');

const { connectDB } = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: 'webboard-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use('/api', apiRoutes);

// =====================================================
// 1. СНАЧАЛА КОНКРЕТНЫЕ МАРШРУТЫ (выход, страницы)
// =====================================================

// ===== ВЫХОД (GET) =====
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
            return res.status(500).send('Ошибка при выходе');
        }
        res.redirect('/');
    });
});

// =====================================================
// 2. ПОТОМ ОБЩИЙ МАРШРУТ (автоматическая маршрутизация)
// =====================================================

// Автоматическая маршрутизация для всех страниц
app.get(['/', '/:page'], (req, res) => {
    const page = req.params.page || 'index';
    const filePath = path.join(__dirname, 'public', page + '.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send('Страница не найдена');
        }
    });
});

// ===== ЗАПУСК =====
app.listen(3000, async () => {
    try {
        await connectDB();
        console.log('🚀 Сервер запущен: http://localhost:3000');
        console.log('📋 Доступные страницы:');
        console.log('  - /');
        console.log('  - /login');
        console.log('  - /register');
        console.log('  - /create-ad');
        console.log('  - /my-ads');
        console.log('  - /admin');
        console.log('  - /logout (выход)');
    } catch (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
    }
});