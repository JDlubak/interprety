const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {getPool} = require("../database");
const {StatusCodes} = require("http-status-codes");
const {sendHttp} = require("../utils/errorHandler");
const sql = require("mssql");
const {
    validateFields, validateLogin, validatePassword, validateString, checkError, validateEmail, validatePhone,
} = require('../utils/validators');

exports.register = async (req, res) => {
    const required = ['login', 'password', 'username', 'phone', 'email'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const {login, password, username, phone, email} = req.body;
    if (checkError(res, validatePassword(password))) return;
    if (checkError(res, validateString(username, 'username', 30))) return;
    try {
        const pool = await getPool();
        if (checkError(res, await validateLogin(pool, login))) return;
        if (checkError(res, await validateEmail(email, pool))) return;
        if (checkError(res, await validatePhone(phone, pool))) return;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const customerRequest = transaction.request();
            customerRequest.input('username', sql.VarChar(30), username);
            customerRequest.input('email', sql.VarChar(100), email);
            customerRequest.input('phone', sql.VarChar(20), phone);
            const result = await customerRequest.query(process.env.INSERT_CUSTOMER);
            const customerId = result.recordset[0].customerId;
            const userRequest = transaction.request();
            const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT));
            userRequest.input('login', sql.VarChar(30), login);
            userRequest.input('passwordHash', sql.VarChar(255), passwordHash);
            userRequest.input('customerId', sql.Int, customerId);
            await userRequest.query(process.env.REGISTER);
            await transaction.commit();
            res.status(StatusCodes.CREATED).json({
                StatusCode: StatusCodes.CREATED, message: `Registration of ${login} has been completed - you can /login now`
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}

exports.login = async (req, res) => {
    const required = ['login', 'password'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const {login, password} = req.body;
    if (typeof password !== "string" || !password.trim() || typeof login !== "string" || !login.trim()) {
        return sendHttp(res, StatusCodes.UNAUTHORIZED, 'Invalid login or password');
    }
    try {
        const pool = await getPool();
        const request = pool.request();
        request.input("login", sql.VarChar(30), login);
        const result = await request.query(process.env.LOGIN_ATTEMPT);
        if (result.recordset.length === 0) {
            return sendHttp(res, StatusCodes.UNAUTHORIZED, 'Invalid login or password');
        }
        const {id, passwordHash, role} = result.recordset[0];
        const match = await bcrypt.compare(password, passwordHash);
        if (!match) {
            return sendHttp(res, StatusCodes.UNAUTHORIZED, 'Invalid login or password');
        }
        const accessToken = jwt.sign({id, role}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
        const refreshToken = jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: `${process.env.JWT_REFRESH_EXPIRES_DAYS}d`});
        const refreshRequest = pool.request();
        refreshRequest.input("id", sql.Int, id);
        refreshRequest.input("refreshToken", sql.VarChar(sql.MAX), refreshToken);
        refreshRequest.input("accessToken", sql.VarChar(sql.MAX), accessToken);
        await refreshRequest.query(process.env.PUT_TOKENS);
        return res.json({
            accessToken: accessToken, refreshToken: refreshToken
        })

    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}

exports.refreshToken = async (req, res) => {
    const required = ['refreshToken'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return sendHttp(res, StatusCodes.UNAUTHORIZED, "Refresh token is missing");
    }
    try {
        const pool = await getPool();
        const request = pool.request();
        request.input("refreshToken", sql.VarChar(sql.MAX), refreshToken);
        const result = await request.query(process.env.CHECK_REFRESH_TOKEN);
        if (result.recordset.length === 0) {
            return sendHttp(res, StatusCodes.UNAUTHORIZED, 'Invalid refresh token');
        }
        const {id, role} = result.recordset[0];
        const newAccessToken = jwt.sign(
            {id: id, role: role},
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES_IN},
        )
        const newRefreshToken = jwt.sign(
            { id },
            process.env.JWT_SECRET,
            { expiresIn: `${process.env.JWT_REFRESH_EXPIRES_DAYS}d` }
        );
        const refreshRequest = pool.request();
        refreshRequest.input("id", sql.Int, id);
        refreshRequest.input("refreshToken", sql.VarChar(sql.MAX), newRefreshToken);
        await refreshRequest.query(process.env.PUT_REFRESH_TOKEN);
        return res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}
