require('dotenv').config();
const {getPool} = require('../utils/database');
const {StatusCodes} = require('http-status-codes');
const {sendHttp} = require('../utils/errorHandler');
const sql = require("mssql");
const Groq = require("groq-sdk");
const {
    checkError, validateId, validateRole
} = require("../utils/validators");

async function handleGetQuery(res, query, params = [], isCustomerAllOrdersQuery = false) {
    try {
        const pool = await getPool();
        const request = pool.request();
        for (const param of params) {
            request.input(param.name, param.type, param.value);
        }
        const result = await request.query(query);
        console.log(result);
        if (result.recordset.length > 0) {
            return sendHttp(res, StatusCodes.OK, result.recordset);
        }
        if (isCustomerAllOrdersQuery) {
            return sendHttp(res, StatusCodes.NOT_FOUND, `You don't have any orders!`);
        }
        const idValue = params.find(p => p.name === 'id')?.value;
        const message = idValue ? `Record with id ${idValue} not found` : "Record not found";
        return sendHttp(res, StatusCodes.NOT_FOUND, message);
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}

exports.getAllCategories = async (req, res) => {
    await handleGetQuery(res, process.env.CATEGORY_QUERY);
}

exports.getAllStatuses = async (req, res) => {
    await handleGetQuery(res, process.env.STATUS_QUERY);
}

exports.getAllProducts = async (req, res) => {
    await handleGetQuery(res, process.env.PRODUCTS_QUERY);
}

exports.getAllOrders = async (req, res) => {
    if (req.user.role === 'worker') {
        await handleGetQuery(res, process.env.ORDERS_WORKER_QUERY);
    } else {
        await handleGetQuery(res, process.env.ORDERS_CUSTOMER_QUERY, [{
            name: 'id', type: sql.Int, value: req.user.id
        }], true);
    }
}

exports.getProductById = async (req, res) => {
    await handleGetQuery(res, process.env.PRODUCTS_ID_QUERY, [{name: 'id', type: sql.Int, value: req.params.id}]);
}

exports.getOrderById = async (req, res) => {
    if (req.user.role === 'worker') {
        await handleGetQuery(res, process.env.ORDERS_ID_QUERY_WORKER, [{
            name: 'id',
            type: sql.Int,
            value: req.params.id
        }]);
    } else {
        await handleGetQuery(res, process.env.ORDERS_ID_QUERY_CUSTOMER,
            [{name: 'id', type: sql.Int, value: req.params.id},
                {name: 'userId', type: sql.Int, value: req.user.id}]);
    }
}

exports.getProfile = async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'customer'))) return;
    await handleGetQuery(res, process.env.CUSTOMER_QUERY, [{name: 'id', type: sql.Int, value: req.user.id}]);
}

exports.getProductSeoDescription = async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, id, process.env.CHECK_PRODUCT, 'product'))) return;
        const request = pool.request();
        request.input('id', sql.Int, id);
        const result = await request.query(process.env.PRODUCTS_ID_QUERY);
        const {product, price, weight, category} = result.recordset[0];
        const prompt = process.env.GROQ_PROMPT_TEMPLATE
            .replace('{product}', product)
            .replace('{price}', price)
            .replace('{weight}', weight)
            .replace('{category}', category);
        const groq = new Groq({apiKey: process.env.Groq_API_KEY});
        const response = await groq.chat.completions.create({
            messages: [{
                role: "user", content: prompt,
            },], model: process.env.GROQ_MODEL,
        });
        const seoHtml = response.choices?.[0]?.message?.content;

        if (seoHtml) {
            res.set("Content-Type", "text/html");
            res.send(seoHtml);
        } else {
            sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, 'A problem has occurred while creating description');
        }
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}

exports.getOrderOpinion = async (req, res) => {
    const orderId = parseInt(req.params.id);
    if (req.user.role === 'worker') {
        await handleGetQuery(res, process.env.ORDER_OPINION_WORKER_QUERY, [
            {name: 'id', type: sql.Int, value: orderId}
        ]);
    } else {
        await handleGetQuery(res, process.env.ORDER_OPINION_CUSTOMER_QUERY, [
            {name: 'id', type: sql.Int, value: orderId},
            {name: 'userId', type: sql.Int, value: req.user.id}
        ]);
    }
}
