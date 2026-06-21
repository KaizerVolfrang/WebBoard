// Глобальная проверка админа для всех страниц
async function updateAdminLink() {
    try {
        const response = await fetch('/api/current-user');
        if (response.ok) {
            const data = await response.json();

            // Ссылка на админ-панель
            const adminLink = document.getElementById('adminLink');
            if (adminLink) {
                if (data.isAuth && data.user.RoleID === 1) {
                    adminLink.style.display = 'inline';
                } else {
                    adminLink.style.display = 'none';
                }
            }

            // Управление авторизацией
            const authLinks = document.getElementById('auth-links');
            const userInfo = document.getElementById('user-info');
            const username = document.getElementById('username');

            if (data.isAuth) {
                // Пользователь авторизован
                authLinks.style.display = 'none';
                userInfo.style.display = 'flex';
                if (username) username.textContent = '👤 ' + data.user.Login;
            } else {
                // Пользователь НЕ авторизован
                authLinks.style.display = 'flex';
                userInfo.style.display = 'none';  // ← Скрываем "Выйти"
                if (username) username.textContent = '';
            }
        }
    } catch (error) {
        console.log('Ошибка проверки админа:', error);
        // При ошибке тоже скрываем всё
        const authLinks = document.getElementById('auth-links');
        const userInfo = document.getElementById('user-info');
        if (authLinks) authLinks.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
    }
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', updateAdminLink);