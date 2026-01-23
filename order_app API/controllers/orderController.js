require('dotenv').config();
const sql = require("mssql");
const {
    checkError, validateFields, validateId, validateItems, validateStatus, validateString, validateNumber, validateRole, validateOrder
} = require("../utils/validators");
const {sendHttp} = require("../utils/errorHandler");
const {StatusCodes} = require("http-status-codes");
const {getPool} = require("../utils/database");


exports.createOrder = async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'customer'))) return;
    const required = ['customerId', 'fullName', 'items'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const {customerId, fullName, items} = req.body;
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, customerId, process.env.CHECK_CUSTOMER, 'customer'))) return;
        if (checkError(res, await validateItems(items, pool))) return;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const request = transaction.request();
            request.input('customerId', sql.Int, customerId);
            request.input('fullName', sql.VarChar, fullName);
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
}

exports.changeOrderStatus = async (req, res) => {
    const { role, id } = req.user;
    console.log(req.user);
    const required = ["status"];
    if (checkError(res, validateFields(required, req.body, "PATCH"))) return;
    const status = req.body.status.toUpperCase();
    const statusToId = {
        UNCONFIRMED: 1, CONFIRMED: 2, CANCELLED: 3, COMPLETED: 4
    };
    const orderId = parseInt(req.params.id, 10);
    if (role === 'customer') {
        if (status !== 'CANCELLED') {
            return sendHttp(res, StatusCodes.FORBIDDEN, "Customers can only cancel orders!")
        }
    }
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, orderId, process.env.CHECK_ORDER, 'order'))) return;
        if (checkError(res, await validateStatus(pool, status, orderId))) return;
        if (role === 'customer') {
            const checkOwner = await pool.request()
                .input('orderId', sql.Int, orderId)
                .query(process.env.IS_THEIR_ORDER);
            const customerId = await pool.request()
                .input('id', sql.Int, id)
                .query(process.env.GET_CUSTOMER_ID);
            const owner = checkOwner.recordset[0]?.customer_id;
            const owner2 = customerId.recordset[0]?.customer_id;
            if (owner !== owner2) {
                return sendHttp(res, StatusCodes.FORBIDDEN, "You can only cancel your own orders.");
            }
        }
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
}

exports.addOpinionToOrder = async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'customer'))) return;
    const userId = parseInt(req.user.id, 10);
    const orderId = parseInt(req.params.id, 10);
    const allowedFields = ['rating', 'content'];
    const updateFields = Object.keys(req.body).filter(f => allowedFields.includes(f));
    if (updateFields.length === 0) {
        return sendHttp(res, StatusCodes.BAD_REQUEST, "Posting opinion requires 'rating' field, and optionally 'content' field");
    }
    if (checkError(res, validateFields(allowedFields, req.body, "POST_OPINION"))) return;
    const {rating, content} = req.body;
    if (checkError(res, validateNumber(rating, 'rating', true))) return;
    if (checkError(res, validateString(content, 'content'))) return;
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, orderId, process.env.CHECK_ORDER, 'order'))) return;
        if (checkError(res, await validateOrder(pool, orderId, userId))) return;
        const request = await pool.request();
        request.input('orderId', sql.Int, orderId);
        request.input('rating', sql.Int, rating);
        request.input('content', sql.VarChar(sql.MAX), content);
        await request.query(process.env.CREATE_OPINION);
        res.status(StatusCodes.CREATED).json({
            StatusCode: StatusCodes.CREATED, message: `Opinion has been created!`
        });
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}