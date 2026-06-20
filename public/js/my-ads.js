// Проверка авторизации и загрузка объявлений
async function loadMyAds() {
  try {
    // Сразу показываем сообщение "Проверка..."
    const container = document.getElementById("ads-list");
    container.innerHTML = "Проверка авторизации...";

    // Проверяем, авторизован ли пользователь
    const authResponse = await fetch("/api/current-user");
    const authData = await authResponse.json();

    if (!authData.isAuth) {
      // Запоминаем, куда пользователь хотел попасть
      sessionStorage.setItem("redirectAfterLogin", "/my-ads");
      window.location.href = "/login";
      return;
    }

    // Показываем имя пользователя
    document.getElementById("username").textContent =
      "👤 " + authData.user.Login;

    // Загружаем объявления
    container.innerHTML = "Загрузка объявлений...";
    const response = await fetch("/api/my-ads");
    const ads = await response.json();

    if (ads.length === 0) {
      container.innerHTML = `
                <div class="empty">
                    <h3>У вас пока нет объявлений</h3>
                    <p><a href="/create-ad">Создать первое объявление</a></p>
                </div>
            `;
      return;
    }

    container.innerHTML = ads
      .map((ad) => {
        // Определяем класс для статуса
        let statusClass = "badge-pending";
        let statusText = "На модерации";

        if (ad.Status === "Approved" || ad.Status === "approved") {
          statusClass = "badge-approved";
          statusText = "Опубликовано ✅";
        } else if (ad.Status === "Rejected" || ad.Status === "rejected") {
          statusClass = "badge-rejected";
          statusText = "Отклонено ❌";
        }

        return `
                <div class="ad-card">
                    <h2 class="ad-title">${escapeHtml(ad.Title)}</h2>
                    <p>${escapeHtml(ad.Description)}</p>
                    <div>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="ad-meta">
                        📅 ${new Date(ad.CreatedAt).toLocaleDateString()}
                        ${ad.StartDate ? ` | 📅 Начало: ${new Date(ad.StartDate).toLocaleDateString()}` : ""}
                        ${ad.EndDate ? ` | 📅 Окончание: ${new Date(ad.EndDate).toLocaleDateString()}` : ""}
                    </div>
                </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Ошибка:", error);
    document.getElementById("ads-list").innerHTML =
      '<p class="error">Ошибка загрузки объявлений</p>';
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Выход
document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
});

// Запуск
loadMyAds();
