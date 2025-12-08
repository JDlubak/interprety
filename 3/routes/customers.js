require('dotenv').config();
const express = require('express');
const router = express.Router();
const {handleGetQuery} = require('../utils/getQueryHandler')
const sql = require("mssql");
const {checkError, validateFields, validateString, validateEmail, validatePhone} = require("../utils/validators");
const {getPool} = require("../database");
const {StatusCodes} = require("http-status-codes");
const {sendHttp} = require("../utils/errorHandler");

// Ten route na razie jest stosunkowo głupi,
// bo każdy może bardzo łatwo podejrzeć wszystkie informacje o wszystkich klientach,
// w przyszłości będzie do przerobienia
router.get('/', async (req, res) => {
    await handleGetQuery(res, process.env.CUSTOMER_QUERY);
});

router.get('/:id', async (req, res) => {
    await handleGetQuery(res, process.env.CUSTOMER_ID_QUERY,
        [{name: 'id', type: sql.Int, value: req.params.id}],
    );
});

router.post('/', async (req, res) => {
    const required = ['username', 'phone', 'email'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const { username, phone, email } = req.body;
    try {
        const pool = await getPool();
        if (checkError(res, validateString(username, 'username', 30))) return;
        if (checkError(res, await validateEmail(email, pool))) return;
        if (checkError(res, await validatePhone(phone, pool))) return;
        const request = pool.request();
        request.input('username', sql.VarChar(30), username);
        request.input('email', sql.VarChar(100), email);
        request.input('phone', sql.VarChar(20), phone);
        const result = await request.query(process.env.INSERT_CUSTOMER);
        res.status(StatusCodes.CREATED).json({
            StatusCode: StatusCodes.CREATED, message: 'Customer created', product: result.recordset[0]
        });
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
});

module.exports = router;
