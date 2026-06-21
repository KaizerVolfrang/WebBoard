const form = document.getElementById("adForm");
const categoriesContainer = document.getElementById("categories-container");

// Загрузка категорий
async function loadCategories() {
  try {
    const response = await fetch("/api/categories");
    const categories = await response.json();

    if (categories.length === 0) {
      categoriesContainer.innerHTML =
        '<p style="color:#999;">Нет доступных категорий</p>';
      return;
    }

    categoriesContainer.innerHTML = categories
      .map(
        (cat) => `
            <label class="category-checkbox">
                <input type="checkbox" name="categories" value="${cat.CategoryID}">
                ${escapeHtml(cat.CategoryName)}
            </label>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Ошибка загрузки категорий:", error);
    categoriesContainer.innerHTML =
      '<p class="error">Ошибка загрузки категорий</p>';
  }
}

// Проверяем авторизацию
async function checkAuthForCreateAd() {
  try {
    const response = await fetch("/api/current-user");
    if (response.ok) {
      const data = await response.json();
      if (!data.isAuth) {
        sessionStorage.setItem("redirectAfterLogin", "/create-ad");
        window.location.href = "/login";
        return;
      }

      document.getElementById("username").textContent = "👤 " + data.user.Login;
      document.getElementById("auth-links").style.display = "none";
      document.getElementById("user-info").style.display = "flex";

      const adminLink = document.getElementById("adminLink");
      if (data.user.RoleID === 1) {
        adminLink.style.display = "inline";
      } else {
        adminLink.style.display = "none";
      }
    }
  } catch (error) {
    console.log("Ошибка проверки авторизации:", error);
    sessionStorage.setItem("redirectAfterLogin", "/create-ad");
    window.location.href = "/login";
  }
}

// Отправка формы
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const price = document.getElementById("price").value; // ← цена

  // Собираем выбранные категории
  const checkedCategories = document.querySelectorAll(
    'input[name="categories"]:checked',
  );
  const categories = Array.from(checkedCategories).map((cb) =>
    parseInt(cb.value),
  );

  if (categories.length === 0) {
    document.getElementById("message").className = "error";
    document.getElementById("message").textContent =
      "❌ Выберите хотя бы один раздел";
    return;
  }

  try {
    const response = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        startDate,
        endDate,
        price: price || null, // если пусто — отправляем null
        categories,
      }),
    });

    const data = await response.json();
    const messageEl = document.getElementById("message");

    if (response.ok) {
      messageEl.className = "success";
      messageEl.textContent = data.message || "✅ Объявление создано!";
      form.reset();
      document
        .querySelectorAll('input[name="categories"]:checked')
        .forEach((cb) => (cb.checked = false));
    } else if (response.status === 401) {
      sessionStorage.setItem("redirectAfterLogin", "/create-ad");
      window.location.href = "/login";
    } else if (response.status === 403) {
      messageEl.className = "error";
      messageEl.innerHTML = `
        <strong>⛔ Доступ запрещён</strong><br>
        ${data.error || "Вам запрещено публиковать объявления в этом разделе"}<br>
        <span style="font-size:0.9rem; color:#666;">
          Обратитесь к администратору для получения разрешения.
        </span>
      `;
    } else {
      messageEl.className = "error";
      messageEl.textContent =
        data.error || data.message || "❌ Ошибка создания";
    }
  } catch (error) {
    console.error("Ошибка:", error);
    document.getElementById("message").className = "error";
    document.getElementById("message").textContent =
      "❌ Ошибка соединения с сервером";
  }
});

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Запуск
loadCategories();
checkAuthForCreateAd();
