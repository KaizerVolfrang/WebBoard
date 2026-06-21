let allAds = [];
let currentFilter = 'all';

// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch('/api/current-user');
        const data = await response.json();

        if (!data.isAuth) {
            window.location.href = '/login';
            return null;
        }

        // Проверяем, админ ли пользователь
        if (data.user.RoleID !== 1) {
            document.getElementById('ads-list').innerHTML = `
                <div style="text-align:center;padding:2rem;color:#e74c3c;">
                    <h2>⛔ Доступ запрещён</h2>
                    <p>Эта страница доступна только администраторам.</p>
                </div>
            `;
            return null;
        }

        const username = document.getElementById('username');
        if (username) username.textContent = '👤 ' + data.user.Login;

        return data.user;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        return null;
    }
}

// Загрузка всех объявлений для админа
async function loadAds() {
    try {
        const response = await fetch('/api/admin/ads');
        allAds = await response.json();
        renderAds();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('ads-list').innerHTML = '<p class="error">Ошибка загрузки объявлений</p>';
    }
}

// ===== СТАТИСТИКА =====
async function loadStatistics() {
    const container = document.getElementById('statistics-content');
    container.innerHTML = 'Загрузка статистики...';

    try {
        const response = await fetch('/api/admin/statistics');
        const data = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p class="error">Ошибка: ${data.error || 'Неизвестная ошибка'}</p>`;
            return;
        }

        let html = '';

        // Активные пользователи
        html += `<h3>🏆 Самые активные клиенты</h3><ul>`;
        if (data.activeUsers.length === 0) {
            html += '<li>Нет данных</li>';
        } else {
            data.activeUsers.forEach(u => {
                html += `<li>${escapeHtml(u.Login)} — ${u.AdsCount} объявлений</li>`;
            });
        }
        html += `</ul>`;

        // Популярные разделы
        html += `<h3>📂 Самые популярные разделы</h3><ul>`;
        if (data.popularCategories.length === 0) {
            html += '<li>Нет данных</li>';
        } else {
            data.popularCategories.forEach(c => {
                html += `<li>${escapeHtml(c.CategoryName)} — ${c.AdsCount} объявлений</li>`;
            });
        }
        html += `</ul>`;

        // Популярные дни
        html += `<h3>📅 Самые популярные дни</h3><ul>`;
        if (data.popularDays.length === 0) {
            html += '<li>Нет данных</li>';
        } else {
            data.popularDays.forEach(d => {
                html += `<li>${escapeHtml(d.Day)} — ${d.AdsCount} объявлений</li>`;
            });
        }
        html += `</ul>`;

        container.innerHTML = html;

    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<p class="error">Ошибка загрузки статистики</p>';
    }
}

// Рендеринг объявлений с фильтром
// Рендеринг объявлений с фильтром
function renderAds() {
    const container = document.getElementById('ads-list');
    container.style.display = 'block';

    let filtered = allAds;
    if (currentFilter !== 'all') {
        filtered = allAds.filter(ad =>
            ad.Status.toLowerCase() === currentFilter.toLowerCase()
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align:center;padding:2rem;color:#999;">Нет объявлений</p>`;
        return;
    }

    container.innerHTML = filtered.map(ad => {
        let statusClass = 'badge-pending';
        let statusText = 'На модерации';
        let cardClass = 'pending';

        if (ad.Status === 'Approved') {
            statusClass = 'badge-approved';
            statusText = 'Одобрено ✅';
            cardClass = 'approved';
        } else if (ad.Status === 'Rejected') {
            statusClass = 'badge-rejected';
            statusText = 'Отклонено ❌';
            cardClass = 'rejected';
        }

        const isPending = ad.Status === 'Pending';
        const priceDisplay = ad.Price ? ad.Price + ' ₽' : 'Цена не указана';

        return `
            <div class="ad-card ${cardClass}">
                <a href="/ad?id=${ad.AdID}" style="text-decoration:none; color:inherit; display:block;">
                    <h2 style="color:#2c3e50;">${escapeHtml(ad.Title)}</h2>
                    <p>${escapeHtml(ad.Description)}</p>
                    <div style="font-weight:bold; color:#27ae60; margin:0.3rem 0;">
                        💰 ${priceDisplay}
                    </div>
                    <div>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="ad-meta">
                        👤 ${escapeHtml(ad.UserName)} (ID: ${ad.UserID})
                        | 📅 ${new Date(ad.CreatedAt).toLocaleDateString()}
                        ${ad.StartDate ? ` | 📅 Начало: ${new Date(ad.StartDate).toLocaleDateString()}` : ''}
                        ${ad.EndDate ? ` | 📅 Окончание: ${new Date(ad.EndDate).toLocaleDateString()}` : ''}
                    </div>
                </a>
                ${isPending ? `
                    <div style="margin-top:0.5rem;">
                        <button class="btn-approve" data-id="${ad.AdID}">✅ Одобрить</button>
                        <button class="btn-reject" data-id="${ad.AdID}">❌ Отклонить</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', () => moderateAd(btn.dataset.id, 'approve'));
    });
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', () => moderateAd(btn.dataset.id, 'reject'));
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Модерация объявления
async function moderateAd(adId, action) {
    const endpoint = `/api/admin/${action}/${adId}`;

    try {
        const response = await fetch(endpoint, { method: 'POST' });
        const result = await response.json();

        if (response.ok) {
            await loadAds();
        } else {
            alert('Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при выполнении действия');
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (ИСПРАВЛЕНО) =====
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;

        // Получаем контейнеры
        const adsList = document.getElementById('ads-list');
        const statsContainer = document.getElementById('statistics-container');

        // Если вкладка "Статистика"
        if (target === 'statistics') {
            adsList.style.display = 'none';
            statsContainer.style.display = 'block';
            loadStatistics();
        } else {
            // Иначе — показываем объявления
            adsList.style.display = 'block';
            statsContainer.style.display = 'none';
            currentFilter = target;
            renderAds();
        }
    });
});

// Выход
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
});

// Запуск
checkAuth().then(user => {
    if (user && user.RoleID === 1) {
        loadAds();
    }
});