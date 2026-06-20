const express = require("express");
const router = express.Router();

const { connectDB } = require("../config/db");

const authController = require("../controllers/authController");

router.post("/register", authController.register);

router.post("/login", authController.login);

// === ОТЛАДОЧНЫЙ МИДЛВЕР ===
router.use((req, res, next) => {
  console.log("🔍 Сессия в API:", req.session.user);
  next();
});
/*
Получить текущего пользователя
GET /api/current-user
*/
router.get("/current-user", (req, res) => {
  if (!req.session.user) {
    return res.json({
      isAuth: false,
    });
  }

  res.json({
    isAuth: true,
    user: req.session.user,
  });
});

/*
========================================
Получить все категории
GET /api/categories
========================================
*/

router.get("/categories", async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
                SELECT
                    CategoryID,
                    CategoryName,
                    Description
                FROM Categories
                ORDER BY CategoryName
            `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
========================================
Получить объявления
GET /api/ads
========================================
*/

router.get("/ads", async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
                SELECT
                    a.AdID,
                    a.Title,
                    a.Description,
                    a.StartDate,
                    a.EndDate,
                    a.CreatedAt,
                    a.Status,
                    u.Login AS UserName
                FROM Ads a
                INNER JOIN Users u
                    ON a.UserID = u.UserID
                ORDER BY a.CreatedAt DESC
            `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
========================================
Получить объявления текущего пользователя
GET /api/my-ads
========================================
*/

router.get("/my-ads", async (req, res) => {
  // Проверяем, авторизован ли пользователь
  if (!req.session.user) {
    return res.status(401).json({
      error: "Необходимо войти в систему",
    });
  }

  try {
    const pool = await connectDB();

    const result = await pool.request().input("userId", req.session.user.UserID)
      .query(`
                SELECT
                    a.AdID,
                    a.Title,
                    a.Description,
                    a.StartDate,
                    a.EndDate,
                    a.CreatedAt,
                    a.Status,
                    u.Login AS UserName
                FROM Ads a
                INNER JOIN Users u
                    ON a.UserID = u.UserID
                WHERE a.UserID = @userId
                ORDER BY a.CreatedAt DESC
            `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

/*
========================================
Создать объявление
POST /api/ads
========================================
*/

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      message: "Выход выполнен",
    });
  });
});

router.post("/ads", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      error: "Необходимо войти в систему",
    });
  }

  try {
    const { title, description, startDate, endDate } = req.body;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("title", title)
      .input("description", description)
      .input("startDate", startDate)
      .input("endDate", endDate)
      .input("userId", req.session.user.UserID).query(`
                INSERT INTO Ads
                (
                    UserID,
                    Title,
                    Description,
                    StartDate,
                    EndDate,
                    Status
                )
                VALUES
                (
                    @userId,
                    @title,
                    @description,
                    @startDate,
                    @endDate,
                    'Pending'
                );

                SELECT SCOPE_IDENTITY() AS AdID;
            `);

    res.status(201).json({
      success: true,

      adId: result.recordset[0].AdID,

      message: "Объявление успешно создано",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
========================================
АДМИНКА
========================================
*/

// Проверка, является ли пользователь администратором
function isAdmin(req) {
  return req.session.user && req.session.user.RoleID === 1;
}

// GET /api/admin/ads — получить все объявления (включая на модерации)
router.get("/admin/ads", async (req, res) => {
  // Проверяем права
  if (!isAdmin(req)) {
    return res.status(403).json({
      error: "Доступ запрещён. Только для администраторов.",
    });
  }

  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
            SELECT
                a.AdID,
                a.Title,
                a.Description,
                a.StartDate,
                a.EndDate,
                a.CreatedAt,
                a.Status,
                u.Login AS UserName,
                u.UserID
            FROM Ads a
            INNER JOIN Users u
                ON a.UserID = u.UserID
            ORDER BY 
                CASE a.Status
                    WHEN 'Pending' THEN 1
                    WHEN 'Approved' THEN 2
                    WHEN 'Rejected' THEN 3
                END,
                a.CreatedAt DESC
        `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/approve/:id — одобрить объявление
router.post("/admin/approve/:id", async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      error: "Доступ запрещён. Только для администраторов.",
    });
  }

  try {
    const adId = req.params.id;
    const pool = await connectDB();

    await pool.request().input("adId", adId).input("status", "Approved").query(`
                UPDATE Ads
                SET Status = @status
                WHERE AdID = @adId
            `);

    res.json({
      success: true,
      message: "Объявление одобрено",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/reject/:id — отклонить объявление
router.post("/admin/reject/:id", async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      error: "Доступ запрещён. Только для администраторов.",
    });
  }

  try {
    const adId = req.params.id;
    const pool = await connectDB();

    await pool.request().input("adId", adId).input("status", "Rejected").query(`
                UPDATE Ads
                SET Status = @status
                WHERE AdID = @adId
            `);

    res.json({
      success: true,
      message: "Объявление отклонено",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
