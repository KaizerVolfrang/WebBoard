// Получаем ID объявления из URL
function getAdIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadAd() {
    const adId = getAdIdFromUrl();
    const container = document.getElementById('ad-detail');

    if (!adId) {
        container.innerHTML = '<p class="error">ID объявления не указан</p>';
        return;
    }

    try {
        const response = await fetch(`/api/ads/${adId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                container.innerHTML = '<p class="error">Объявление не найдено</p>';
            } else {
                container.innerHTML = '<p class="error">Ошибка загрузки объявления</p>';
            }
            return;
        }

        const ad = await response.json();

        // Определяем статус
        let statusClass = 'status-pending';
        let statusText = 'На модерации';
        if (ad.Status === 'Approved' || ad.Status === 'approved') {
            statusClass = 'status-approved';
            statusText = '✅ Опубликовано';
        } else if (ad.Status === 'Rejected' || ad.Status === 'rejected') {
            statusClass = 'status-rejected';
            statusText = '❌ Отклонено';
        }

        // Определяем цену (пока нет поля Price, используем заглушку)
        const price = ad.Price ? ad.Price + ' ₽' : 'Цена не указана';

        container.innerHTML = `
            <a href="/" class="btn-back">← Назад к списку</a>
            
            <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap;">
                <h1>${escapeHtml(ad.Title)}</h1>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>

            <div class="ad-image-placeholder">
                📸 Изображение товара
            </div>

            <div class="price">${typeof price === 'number' ? price + ' ₽' : price}</div>

            <div class="description">
                ${escapeHtml(ad.Description)}
            </div>

            <div style="margin: 1rem 0;">
                ${ad.Categories ? ad.Categories.split(',').map(cat => 
                    `<span class="categories">#${escapeHtml(cat.trim())}</span>`
                ).join('') : '<span style="color:#999;">Без категорий</span>'}
            </div>

            <div class="seller">
                <h3>👤 Продавец</h3>
                <p><strong>${escapeHtml(ad.UserName)}</strong></p>
                <p style="color:#666; font-size:0.9rem;">${escapeHtml(ad.UserEmail)}</p>
                <div class="seller-rating">
                    <span class="stars">★★★★★</span>
                    <span style="color:#999;">(0 отзывов)</span>
                </div>
                <p style="color:#999; font-size:0.85rem; margin-top:0.5rem;">
                    На сайте с ${new Date(ad.CreatedAt).toLocaleDateString()}
                </p>
            </div>

            <div style="display:flex; gap:1rem; margin-top:1rem; flex-wrap:wrap;">
                <button class="buy-btn" onclick="alert('Функция покупки в разработке')">
                    💳 Купить сейчас
                </button>
                <button class="buy-btn" style="background:#3498db;" onclick="alert('Функция добавления в корзину в разработке')">
                    🛒 В корзину
                </button>
            </div>

            <div class="meta">
                <p>📅 Создано: ${new Date(ad.CreatedAt).toLocaleDateString()}</p>
                ${ad.StartDate ? `<p>📅 Начало: ${new Date(ad.StartDate).toLocaleDateString()}</p>` : ''}
                ${ad.EndDate ? `<p>📅 Окончание: ${new Date(ad.EndDate).toLocaleDateString()}</p>` : ''}
            </div>
        `;

    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<p class="error">Ошибка загрузки объявления</p>';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Запуск
loadAd();