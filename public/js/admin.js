let allAds = [];
let currentFilter = 'all';

// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch('/api/current-user');
        const data = await response.json();
        
        if (!data.isAuth) {
            window.location.href = '/login.html';
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

        document.getElementById('username').textContent = '👤 ' + data.user.Login;
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

// Рендеринг объявлений с фильтром
function renderAds() {
    const container = document.getElementById('ads-list');
    
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

        return `
            <div class="ad-card ${cardClass}">
                <h2 style="color:#2c3e50;">${escapeHtml(ad.Title)}</h2>
                <p>${escapeHtml(ad.Description)}</p>
                <div>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div class="ad-meta">
                    👤 ${escapeHtml(ad.UserName)} (ID: ${ad.UserID})
                    | 📅 ${new Date(ad.CreatedAt).toLocaleDateString()}
                    ${ad.StartDate ? ` | 📅 Начало: ${new Date(ad.StartDate).toLocaleDateString()}` : ''}
                    ${ad.EndDate ? ` | 📅 Окончание: ${new Date(ad.EndDate).toLocaleDateString()}` : ''}
                </div>
                ${isPending ? `
                    <div style="margin-top:0.5rem;">
                        <button class="btn btn-approve" data-id="${ad.AdID}">✅ Одобрить</button>
                        <button class="btn btn-reject" data-id="${ad.AdID}">❌ Отклонить</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Навешиваем обработчики на кнопки
    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', () => moderateAd(btn.dataset.id, 'approve'));
    });
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', () => moderateAd(btn.dataset.id, 'reject'));
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Модерация объявления
async function moderateAd(adId, action) {
    const endpoint = `/api/admin/${action}/${adId}`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (response.ok) {
            // Перезагружаем список
            await loadAds();
        } else {
            alert('Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при выполнении действия');
    }
}

// Переключение вкладок
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.tab;
        renderAds();
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