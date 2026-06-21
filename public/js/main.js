// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch('/api/current-user');
        if (response.ok) {
            const data = await response.json();
            const authLinks = document.getElementById('auth-links');
            const userInfo = document.getElementById('user-info');
            const username = document.getElementById('username');

            if (data.isAuth) {
                authLinks.style.display = 'none';
                userInfo.style.display = 'flex';
                username.textContent = '👤 ' + data.user.Login;

                const adminLink = document.getElementById('adminLink');
                if (data.user.RoleID === 1) {
                    adminLink.style.display = 'inline';
                } else {
                    adminLink.style.display = 'none';
                }
            } else {
                authLinks.style.display = 'flex';
                userInfo.style.display = 'none';
            }
        }
    } catch (error) {
        console.log('Ошибка проверки авторизации:', error);
    }
}

// Загрузка объявлений с фильтрами
async function loadAds() {
    try {
        const category = document.getElementById('categoryFilter')?.value || '';
        const sort = document.getElementById('sortFilter')?.value || 'new';
        
        let url = '/api/ads';
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (sort) params.append('sort', sort);
        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url);
        const ads = await response.json();

        const container = document.getElementById('ads-list');

        if (ads.length === 0) {
            container.innerHTML = '<p>Нет объявлений</p>';
            return;
        }

        container.innerHTML = ads.map(ad => {
            const priceDisplay = ad.Price ? ad.Price + ' ₽' : 'Цена не указана';
            return `
                <div class="ad-card">
                    <a href="/ad?id=${ad.AdID}">
                        <h2 class="ad-title">${escapeHtml(ad.Title)}</h2>
                        <p class="ad-description">${escapeHtml(ad.Description)}</p>
                        <div class="ad-price">${priceDisplay}</div>
                        <div class="ad-meta">
                            👤 ${escapeHtml(ad.UserName)} | 📅 ${new Date(ad.CreatedAt).toLocaleDateString()}
                        </div>
                    </a>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('ads-list').innerHTML = '<p class="error">Ошибка загрузки объявлений</p>';
    }
}

// Загрузка категорий для фильтра
async function loadCategoriesForFilter() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        const select = document.getElementById('categoryFilter');
        if (!select) return;
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.CategoryID;
            option.textContent = cat.CategoryName;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Выход
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
});

// Применение фильтров
document.getElementById('applyFilters')?.addEventListener('click', loadAds);

// Запуск
loadCategoriesForFilter();
checkAuth();
loadAds();