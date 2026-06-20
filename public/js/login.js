const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const login = document.getElementById("login").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Получаем данные пользователя, чтобы узнать роль
      const userResponse = await fetch("/api/current-user");
      const userData = await userResponse.json();

      // Проверяем, откуда пришли (если с /my-ads или другой страницы)
      const redirect = sessionStorage.getItem("redirectAfterLogin") || "/";
      sessionStorage.removeItem("redirectAfterLogin");

      if (userData.isAuth && userData.user.RoleID === 1) {
        // Если админ — сразу в админку
        window.location.href = "/admin";
      } else {
        // Иначе на главную или куда хотел
        window.location.href = redirect;
      }
    } else {
      document.getElementById("message").textContent =
        data.message || "Ошибка входа";
      document.getElementById("message").style.color = "red";
    }
  } catch (error) {
    console.error("Ошибка:", error);
    document.getElementById("message").textContent =
      "Ошибка соединения с сервером";
    document.getElementById("message").style.color = "red";
  }
});
