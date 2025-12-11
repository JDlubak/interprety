const express = require('express');
const jwt = require("jsonwebtoken");
const sql = require("mssql");
const router = express.Router();
const {getPool} = require("../database");
const {StatusCodes} = require("http-status-codes");
const {sendHttp} = require("../utils/errorHandler");
const {checkError, validateFields} = require("../utils/validators");

router.post("/", async (req, res) => {
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
})

module.exports = router;