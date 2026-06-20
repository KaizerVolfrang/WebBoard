const bcrypt = require('bcrypt');

const userModel =
    require('../models/userModel');

async function register(req, res) {

    try {

        const {
            login,
            email,
            password
        } = req.body;

        if (
            !login ||
            !email ||
            !password
        ) {

            return res.status(400).json({
                message: 'Заполните все поля'
            });

        }

        const existingUser =
            await userModel.getUserByLogin(login);

        if (existingUser) {

            return res.status(400).json({
                message: 'Логин уже существует'
            });

        }

        const passwordHash =
            await bcrypt.hash(password, 10);

        const newUser =
            await userModel.createUser(
                login,
                email,
                passwordHash
            );

        res.status(201).json({
            message: 'Регистрация успешна',
            userId: newUser.UserID
        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });

    }

}

async function login(req, res) {

    try {

        const {
            login,
            password
        } = req.body;

        const user =
            await userModel.getUserByLogin(login);

        if (!user) {

            return res.status(400).json({
                message: 'Пользователь не найден'
            });

        }

        const isValidPassword =
            await bcrypt.compare(
                password,
                user.PasswordHash
            );

        if (!isValidPassword) {

            return res.status(400).json({
                message: 'Неверный пароль'
            });

        }

        req.session.user = {

            UserID: user.UserID,

            Login: user.Login,

            RoleID: user.RoleID

        };

        res.json({
            message: 'Вход выполнен'
        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });

    }

}

module.exports = {
    register,
    login
};