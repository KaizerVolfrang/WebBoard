const { connectDB } = require('../config/db');

async function getUserByLogin(login) {
    const pool = await connectDB();

    const result = await pool
        .request()
        .input('login', login)
        .query(`
            SELECT *
            FROM Users
            WHERE Login = @login
        `);

    return result.recordset[0];
}

async function createUser(login, email, passwordHash) {
    const pool = await connectDB();

    const result = await pool
        .request()
        .input('login', login)
        .input('email', email)
        .input('passwordHash', passwordHash)
        .query(`
            INSERT INTO Users
            (
                Login,
                Email,
                PasswordHash,
                RoleID,
                IsBlocked
            )
            VALUES
            (
                @login,
                @email,
                @passwordHash,
                2,
                0
            );

            SELECT SCOPE_IDENTITY() AS UserID;
        `);

    return result.recordset[0];
}

module.exports = {
    getUserByLogin,
    createUser
};