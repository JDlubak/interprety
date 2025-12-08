require('dotenv').config();
const express = require('express');
const router = express.Router();
const {handleGetQuery} = require('../utils/getQueryHandler')
const sql = require("mssql");
const {checkError, validateFields, validateId, validateItems, validateStatus} = require("../utils/validators");
const {sendHttp} = require("../utils/errorHandler");
const {StatusCodes} = require("http-status-codes");
const {getPool} = require("../database");

router.get('/', async (req, res) => {
    await handleGetQuery(res, process.env.ORDERS_QUERY);
})

router.get('/status/:id', async (req, res) => {
    await handleGetQuery(res, process.env.ORDERS_ID_QUERY, [{name: 'id', type: sql.Int, value: req.params.id}],);
});

router.post('/', async (req, res) => {
    const required = ['customerId', 'items'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const {customerId, items} = req.body;
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, customerId, process.env.CHECK_CUSTOMER, 'customer'))) return;
        if (checkError(res, await validateItems(items, pool))) return;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const request = transaction.request();
            request.input('customerId', sql.Int, customerId);
            const orderResult = await request.query(process.env.INSERT_ORDER);
            const orderId = orderResult.recordset[0].order_id;
            for (const item of items) {
                const itemRequest = transaction.request();
                itemRequest.input('orderId', sql.Int, orderId);
                itemRequest.input('productId', sql.Int, item.productId);
                itemRequest.input('quantity', sql.Int, item.quantity);
                itemRequest.input('unitPrice', sql.Decimal(10, 2), item.unitPrice);
                itemRequest.input('vat', sql.Decimal(5, 2), item.vat || 0);
                itemRequest.input('discount', sql.Decimal(5, 4), item.discount || 0);
                await itemRequest.query(process.env.INSERT_ORDER_ITEMS);
            }
            await transaction.commit();
            res.status(StatusCodes.CREATED).json({
                StatusCode: StatusCodes.CREATED, message: 'Order created!'
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
});

router.patch('/:id', async (req, res) => {
    const statusToId = {
        UNCONFIRMED: 1, CONFIRMED: 2, CANCELLED: 3, COMPLETED: 4
    };
    const required = ["status"];
    if (checkError(res, validateFields(required, req.body, "PATCH"))) return;
    const status = req.body.status.toUpperCase();
    const orderId = parseInt(req.params.id, 10);
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, orderId, process.env.CHECK_ORDER, 'order'))) return;
        if (checkError(res, await validateStatus(pool, status, orderId))) return;
        const statusId = statusToId[status];
        const request = await pool.request();
        const query = statusId === 2 ? process.env.CONFIRM_ORDER : process.env.PROCESS_ORDER;
        request.input('orderId', sql.Int, orderId);
        request.input('statusId', sql.Int, statusId);
        const result = await request.query(query);
        res.status(StatusCodes.CREATED).json({
            StatusCode: StatusCodes.CREATED, message: `Order set to ${status}`, order: result.recordset[0]
        });
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
})


module.exports = router;
