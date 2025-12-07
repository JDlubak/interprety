require('dotenv').config();
const express = require('express');
const router = express.Router();
const {handleGetQuery} = require('../utils/getQueryHandler')
const sql = require("mssql");
const {checkError, validateFields, validateAll, validateString, validateNumber, validateId, validateItems} = require("../utils/validators");
const {sendHttp} = require("../utils/errorHandler");
const {StatusCodes, NOT_IMPLEMENTED} = require("http-status-codes");
const {getPool} = require("../database");

router.get('/', async (req, res) => {
    await handleGetQuery(res, process.env.ORDERS_QUERY);
})

router.get('/status/:id', async (req, res) => {
    await handleGetQuery(res, process.env.ORDERS_ID_QUERY,
        [{name: 'id', type: sql.Int, value: req.params.id}],
    );
});

router.post('/', async (req, res) => {
    const required = ['customerId', 'items'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const { customerId, items } = req.body;
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, customerId, process.env.CHECK_CUSTOMER, 'customer'))) return;
        if (checkError(res, await validateItems(items, pool))) return;
        throw NOT_IMPLEMENTED;
    }

});



module.exports = router;
