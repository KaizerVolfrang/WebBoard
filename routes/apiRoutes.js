const express = require("express");
const router = express.Router();

const { connectDB } = require("../config/db");

const authController = require("../controllers/authController");

router.post("/register", authController.register);

router.post("/login", authController.login);

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
    const { category, sort } = req.query;
    const pool = await connectDB();

    let sql = `
            SELECT 
                a.AdID,
                a.Title,
                a.Description,
                a.StartDate,
                a.EndDate,
                a.CreatedAt,
                a.Status,
                a.Price,                    
                u.Login AS UserName
            FROM Ads a
            INNER JOIN Users u ON a.UserID = u.UserID
            WHERE a.Status = 'Approved'
        `;

    if (category) {
      sql += `
                AND EXISTS (
                    SELECT 1 FROM AdCategories ac 
                    WHERE ac.AdID = a.AdID AND ac.CategoryID = ${parseInt(category)}
                )
            `;
    }

    if (sort === "old") {
      sql += ` ORDER BY a.CreatedAt ASC`;
    } else {
      sql += ` ORDER BY a.CreatedAt DESC`;
    }

    const result = await pool.request().query(sql);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
========================================
Получить одно объявление по ID
GET /api/ads/:id
========================================
*/
router.get("/ads/:id", async (req, res) => {
  try {
    const adId = req.params.id;
    const pool = await connectDB();

    const result = await pool.request().input("adId", adId).query(`
                SELECT 
                    a.AdID,
                    a.Title,
                    a.Description,
                    a.StartDate,
                    a.EndDate,
                    a.CreatedAt,
                    a.Status,
                    a.Price,
                    u.Login AS UserName,
                    u.Email AS UserEmail,
                    u.UserID,
                    STRING_AGG(c.CategoryName, ', ') AS Categories
                FROM Ads a
                INNER JOIN Users u ON a.UserID = u.UserID
                LEFT JOIN AdCategories ac ON a.AdID = ac.AdID
                LEFT JOIN Categories c ON ac.CategoryID = c.CategoryID
                WHERE a.AdID = @adId
                GROUP BY 
                    a.AdID, a.Title, a.Description, a.StartDate, a.EndDate, 
                    a.CreatedAt, a.Status, a.Price, u.Login, u.Email, u.UserID
            `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Объявление не найдено" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
========================================
Получить объявления текущего пользователя
GET /api/my-ads
========================================
*/

router.get("/my-ads", async (req, res) => {
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
                    a.Price,
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
    return res.status(401).json({ error: "Необходимо войти в систему" });
  }

  try {
    const { title, description, startDate, endDate, categories, price } =
      req.body;

    if (!categories || categories.length === 0) {
      return res.status(400).json({ error: "Выберите хотя бы один раздел" });
    }

    const pool = await connectDB();
    const userId = req.session.user.UserID;

    // ===== ПРОВЕРКА ЗАПРЕТОВ =====
    for (const catId of categories) {
      const check = await pool
        .request()
        .input("userId", userId)
        .input("categoryId", catId).query(`
          SELECT CanPost FROM UserCategoryPermissions
          WHERE UserID = @userId AND CategoryID = @categoryId
        `);

      if (check.recordset.length > 0 && !check.recordset[0].CanPost) {
        return res.status(403).json({
          error: `Вам запрещено публиковать объявления в этом разделе`,
        });
      }
    }

    // 1. Вставляем объявление с ценой
    const result = await pool
      .request()
      .input("title", title)
      .input("description", description)
      .input("startDate", startDate || new Date().toISOString().split("T")[0])
      .input(
        "endDate",
        endDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
      )
      .input("price", price || null)
      .input("userId", userId).query(`
        INSERT INTO Ads (UserID, Title, Description, StartDate, EndDate, Price, Status, CreatedAt)
        VALUES (@userId, @title, @description, @startDate, @endDate, @price, 'Pending', GETDATE());
        SELECT SCOPE_IDENTITY() AS AdID;
      `);

    const adId = result.recordset[0].AdID;

    // 2. Вставляем связи с категориями
    for (const catId of categories) {
      await pool.request().input("adId", adId).input("categoryId", catId)
        .query(`
          INSERT INTO AdCategories (AdID, CategoryID)
          VALUES (@adId, @categoryId)
        `);
    }

    res.status(201).json({
      success: true,
      adId: adId,
      message: "Объявление создано и отправлено на модерацию",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
========================================
АДМИНКА
========================================
*/

function isAdmin(req) {
  return req.session.user && req.session.user.RoleID === 1;
}

// GET /api/admin/ads — получить все объявления (включая на модерации)
router.get("/admin/ads", async (req, res) => {
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
                a.Price,
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

/*
========================================
СТАТИСТИКА (только для админа)
========================================
*/

router.get("/admin/statistics", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const pool = await connectDB();

    const activeUsers = await pool.request().query(`
            SELECT TOP 5
                u.Login,
                COUNT(a.AdID) AS AdsCount
            FROM Users u
            JOIN Ads a ON a.UserID = u.UserID
            GROUP BY u.Login
            ORDER BY AdsCount DESC
        `);

    const popularCategories = await pool.request().query(`
            SELECT TOP 5
                c.CategoryName,
                COUNT(*) AS AdsCount
            FROM AdCategories ac
            JOIN Categories c ON c.CategoryID = ac.CategoryID
            GROUP BY c.CategoryName
            ORDER BY AdsCount DESC
        `);

    const popularDays = await pool.request().query(`
            SELECT TOP 7
                FORMAT(CreatedAt, 'dd.MM.yyyy') AS Day,
                COUNT(*) AS AdsCount
            FROM Ads
            GROUP BY FORMAT(CreatedAt, 'dd.MM.yyyy')
            ORDER BY AdsCount DESC
        `);

    res.json({
      activeUsers: activeUsers.recordset,
      popularCategories: popularCategories.recordset,
      popularDays: popularDays.recordset,
    });
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

/*
========================================
УПРАВЛЕНИЕ КАТЕГОРИЯМИ (только админ)
========================================
*/

router.get("/admin/categories", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
            SELECT CategoryID, CategoryName, Description,
                   (SELECT COUNT(*) FROM AdCategories WHERE CategoryID = c.CategoryID) AS AdCount
            FROM Categories c
            ORDER BY CategoryName
        `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/categories", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const { name, description } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Название категории обязательно" });
    }

    const pool = await connectDB();
    await pool
      .request()
      .input("name", name.trim())
      .input("description", description || "").query(`
                INSERT INTO Categories (CategoryName, Description)
                VALUES (@name, @description)
            `);

    res.status(201).json({ message: "Категория создана" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/categories/:id", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const { name, description } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Название категории обязательно" });
    }

    const pool = await connectDB();
    await pool
      .request()
      .input("id", req.params.id)
      .input("name", name.trim())
      .input("description", description || "").query(`
                UPDATE Categories
                SET CategoryName = @name, Description = @description
                WHERE CategoryID = @id
            `);

    res.json({ message: "Категория обновлена" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/categories/:id", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const pool = await connectDB();

    const check = await pool
      .request()
      .input("id", req.params.id)
      .query(
        `SELECT COUNT(*) AS count FROM AdCategories WHERE CategoryID = @id`,
      );

    if (check.recordset[0].count > 0) {
      return res.status(400).json({
        error: "Нельзя удалить категорию, в которой есть объявления",
      });
    }

    await pool
      .request()
      .input("id", req.params.id)
      .query(`DELETE FROM Categories WHERE CategoryID = @id`);

    res.json({ message: "Категория удалена" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
========================================
ЗАПРЕТ ПУБЛИКАЦИИ В РАЗДЕЛАХ
========================================
*/

router.get("/admin/permissions", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
            SELECT 
                p.PermissionID,
                p.UserID,
                u.Login AS UserName,
                p.CategoryID,
                c.CategoryName,
                p.CanPost
            FROM UserCategoryPermissions p
            JOIN Users u ON p.UserID = u.UserID
            JOIN Categories c ON p.CategoryID = c.CategoryID
            ORDER BY u.Login, c.CategoryName
        `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/permissions", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const { userId, categoryId, canPost } = req.body;

    if (!userId || !categoryId) {
      return res.status(400).json({ error: "Выберите пользователя и раздел" });
    }

    const pool = await connectDB();

    const existing = await pool
      .request()
      .input("userId", userId)
      .input("categoryId", categoryId).query(`
                SELECT * FROM UserCategoryPermissions 
                WHERE UserID = @userId AND CategoryID = @categoryId
            `);

    if (existing.recordset.length > 0) {
      await pool
        .request()
        .input("userId", userId)
        .input("categoryId", categoryId)
        .input("canPost", canPost ? 1 : 0).query(`
                    UPDATE UserCategoryPermissions
                    SET CanPost = @canPost
                    WHERE UserID = @userId AND CategoryID = @categoryId
                `);
    } else {
      await pool
        .request()
        .input("userId", userId)
        .input("categoryId", categoryId)
        .input("canPost", canPost ? 1 : 0).query(`
                    INSERT INTO UserCategoryPermissions (UserID, CategoryID, CanPost)
                    VALUES (@userId, @categoryId, @canPost)
                `);
    }

    res.json({
      success: true,
      message: canPost ? "Разрешено" : "Запрещено",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/permissions/:id", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const pool = await connectDB();
    await pool
      .request()
      .input("id", req.params.id)
      .query(`DELETE FROM UserCategoryPermissions WHERE PermissionID = @id`);

    res.json({ success: true, message: "Запись удалена" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
========================================
УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (только админ)
========================================
*/

// GET /api/admin/users — получить всех пользователей
router.get("/admin/users", async (req, res) => {
  if (!req.session.user || req.session.user.RoleID !== 1) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
            SELECT 
                UserID, 
                Login, 
                Email, 
                RoleID,
                IsBlocked,
                CreatedAt
            FROM Users
            ORDER BY Login
        `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
