// Загрузка категорий
async function loadCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = 'Загрузка...';

    try {
        const response = await fetch('/api/admin/categories');
        const categories = await response.json();

        if (categories.length === 0) {
            container.innerHTML = '<p style="color:#999;">Категории не найдены</p>';
            return;
        }

        container.innerHTML = categories.map(cat => `
            <div class="cat-item" data-id="${cat.CategoryID}">
                <div>
                    <span class="name">${escapeHtml(cat.CategoryName)}</span>
                    <span class="desc">${cat.Description ? escapeHtml(cat.Description) : ''}</span>
                    <span class="count">📦 ${cat.AdCount || 0} объявлений</span>
                </div>
                <div class="actions">
                    <button class="btn-edit btn-small" onclick="editCategory(${cat.CategoryID})">✏️</button>
                    <button class="btn-delete-cat btn-small" onclick="deleteCategory(${cat.CategoryID})">🗑️</button>
                </div>
                <div class="edit-controls">
                    <input type="text" class="edit-name" value="${escapeHtml(cat.CategoryName)}">
                    <input type="text" class="edit-desc" value="${escapeHtml(cat.Description || '')}">
                    <button class="btn-save btn-small" onclick="saveCategory(${cat.CategoryID})">💾</button>
                    <button class="btn-cancel btn-small" onclick="cancelEdit(${cat.CategoryID})">✖</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<p class="error">Ошибка загрузки категорий</p>';
    }
}

// Переключение в режим редактирования
function editCategory(id) {
    const item = document.querySelector(`.cat-item[data-id="${id}"]`);
    item.classList.add('edit-mode');
}

// Отмена редактирования
function cancelEdit(id) {
    const item = document.querySelector(`.cat-item[data-id="${id}"]`);
    item.classList.remove('edit-mode');
}

// Сохранение категории
async function saveCategory(id) {
    const item = document.querySelector(`.cat-item[data-id="${id}"]`);
    const name = item.querySelector('.edit-name').value.trim();
    const description = item.querySelector('.edit-desc').value.trim();

    if (!name) {
        showMessage('Название категории обязательно', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/admin/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        const data = await response.json();
        if (response.ok) {
            showMessage('✅ Категория обновлена', 'success');
            item.classList.remove('edit-mode');
            loadCategories();
        } else {
            showMessage('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showMessage('❌ Ошибка соединения', 'error');
    }
}

// Удаление категории
async function deleteCategory(id) {
    const name = document.querySelector(`.cat-item[data-id="${id}"] .name`).textContent;
    if (!confirm(`Удалить категорию "${name}"?`)) return;

    try {
        const response = await fetch(`/api/admin/categories/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (response.ok) {
            showMessage('✅ Категория удалена', 'success');
            loadCategories();
        } else {
            showMessage('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showMessage('❌ Ошибка соединения', 'error');
    }
}

// Добавление категории
document.getElementById('addCategoryBtn').addEventListener('click', async () => {
    const name = document.getElementById('newCatName').value.trim();
    const description = document.getElementById('newCatDesc').value.trim();

    if (!name) {
        showMessage('Введите название категории', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        const data = await response.json();
        if (response.ok) {
            showMessage('✅ Категория создана', 'success');
            document.getElementById('newCatName').value = '';
            document.getElementById('newCatDesc').value = '';
            loadCategories();
        } else {
            showMessage('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showMessage('❌ Ошибка соединения', 'error');
    }
});

function showMessage(text, type) {
    const el = document.getElementById('message');
    el.className = type;
    el.textContent = text;
    setTimeout(() => { el.textContent = ''; }, 4000);
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

// Запуск
loadCategories();