const express = require('express');
const bcrypt = require("bcryptjs");
const sql = require("mssql");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {validateFields, checkError, validatePassword } = require('../utils/validators');
const {getPool} = require("../database");
const {StatusCodes} = require("http-status-codes");
const {sendHttp} = require("../utils/errorHandler");

router.post("/", async (req, res) => {
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
        const accessToken = jwt.sign(
            { id, role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        const refreshToken = jwt.sign(
            { id },
            process.env.JWT_SECRET,
            { expiresIn: `${process.env.JWT_REFRESH_EXPIRES_DAYS}d` }
        );
        const refreshRequest = pool.request();
        refreshRequest.input("id", sql.Int, id);
        refreshRequest.input("refreshToken", sql.VarChar(sql.MAX), refreshToken);
        await refreshRequest.query(process.env.PUT_REFRESH_TOKEN);
        return res.json({
            accessToken: accessToken,
            refreshToken: refreshToken
        })

    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
});

module.exports = router;