// Загрузка пользователей, категорий и разрешений
async function loadData() {
    await loadUsers();
    await loadCategories();
    await loadPermissions();
}

// Загрузка пользователей
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
            console.error('Ошибка загрузки пользователей:', response.status);
            return;
        }
        const users = await response.json();
        const select = document.getElementById('userSelect');
        select.innerHTML = '<option value="">Выберите пользователя</option>';
        users.forEach(u => {
            const option = document.createElement('option');
            option.value = u.UserID;
            option.textContent = u.Login + (u.IsBlocked ? ' (заблокирован)' : '');
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

// Загрузка категорий
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            console.error('Ошибка загрузки категорий:', response.status);
            return;
        }
        const categories = await response.json();
        const select = document.getElementById('categorySelect');
        select.innerHTML = '<option value="">Выберите раздел</option>';
        categories.forEach(c => {
            const option = document.createElement('option');
            option.value = c.CategoryID;
            option.textContent = c.CategoryName;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
}

// Загрузка разрешений
async function loadPermissions() {
    const container = document.getElementById('permissionsList');
    container.innerHTML = 'Загрузка...';

    try {
        const response = await fetch('/api/admin/permissions');
        if (!response.ok) {
            container.innerHTML = `<p class="error">Ошибка загрузки: ${response.status}</p>`;
            return;
        }
        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = '<p style="color:#999;">Нет настроек разрешений</p>';
            return;
        }

        container.innerHTML = data.map(p => `
            <div class="perm-item" data-id="${p.PermissionID}">
                <div class="info">
                    <span class="user">👤 ${escapeHtml(p.UserName)}</span>
                    <span class="category">📂 ${escapeHtml(p.CategoryName)}</span>
                    <span class="status ${p.CanPost ? 'allowed' : 'denied'}">
                        ${p.CanPost ? '✅ Разрешено' : '❌ Запрещено'}
                    </span>
                </div>
                <button class="btn-delete-perm" onclick="deletePermission(${p.PermissionID})">🗑️</button>
            </div>
        `).join('');

    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<p class="error">Ошибка загрузки</p>';
    }
}

// Сохранение разрешения
document.getElementById('savePermissionBtn').addEventListener('click', async () => {
    const userId = document.getElementById('userSelect').value;
    const categoryId = document.getElementById('categorySelect').value;
    const canPost = parseInt(document.getElementById('canPostSelect').value);

    if (!userId || !categoryId) {
        showMessage('Выберите пользователя и раздел', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, categoryId, canPost })
        });

        const data = await response.json();
        if (response.ok) {
            showMessage(`✅ ${data.message}`, 'success');
            loadPermissions();
        } else {
            showMessage('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showMessage('❌ Ошибка соединения', 'error');
    }
});

// Удаление разрешения
async function deletePermission(id) {
    if (!confirm('Удалить эту настройку?')) return;

    try {
        const response = await fetch(`/api/admin/permissions/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (response.ok) {
            showMessage('✅ Запись удалена', 'success');
            loadPermissions();
        } else {
            showMessage('❌ ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showMessage('❌ Ошибка соединения', 'error');
    }
}

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
loadData();