const express = require('express');
const bcrypt = require("bcryptjs");
const sql = require("mssql");
const router = express.Router();
const {validateFields, validateLogin, validatePassword, validateString, checkError, validateEmail, validatePhone, } = require('../utils/validators');
const {getPool} = require("../database");
const {StatusCodes} = require("http-status-codes");
const {sendHttp} = require("../utils/errorHandler");

router.post("/", async (req, res) => {
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
});

module.exports = router;