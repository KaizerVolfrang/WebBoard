const sql = require('mssql');

const config = {
    server: 'DESKTOP-4H8DJBS',
    port: 1433,
    user: 'webboard_user',
    password: 'WebBoard123',

    database: 'WebBoard',

    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

async function connectDB() {
    try {
        const pool = await sql.connect(config);

        console.log('Подключение к БД успешно');

        return pool;
    }
    catch (err) {
        console.error(err);
    }
}

module.exports = {
    sql,
    connectDB
};