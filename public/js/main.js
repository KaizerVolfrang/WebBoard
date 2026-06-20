// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('auth-links').style.display = 'none';
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('username').textContent = data.user.Login;
        }
    } catch (error) {
        console.log('Не авторизован');
    }
}

// Загрузка объявлений
async function loadAds() {
    try {
        const response = await fetch('/api/ads');
        const ads = await response.json();
        
        const container = document.getElementById('ads-list');
        
        if (ads.length === 0) {
            container.innerHTML = '<p>Пока нет объявлений</p>';
            return;
        }
        
        container.innerHTML = ads.map(ad => `
            <div class="ad-card">
                <h2 class="ad-title">${escapeHtml(ad.Title)}</h2>
                <p class="ad-description">${escapeHtml(ad.Description)}</p>
                <div class="ad-price">${ad.Price} ₽</div>
                <div class="ad-meta">
                    👤 ${escapeHtml(ad.UserName)} | 📅 ${new Date(ad.CreatedAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('ads-list').innerHTML = '<p class="error">Ошибка загрузки объявлений</p>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Запуск при загрузке страницы
checkAuth();
loadAds();