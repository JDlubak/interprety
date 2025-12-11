require('dotenv').config();
const express = require('express');
const router = express.Router();
const {handleGetQuery} = require('../utils/getQueryHandler')
const sql = require("mssql");
const {StatusCodes} = require("http-status-codes");
const {sendHttp} = require('../utils/errorHandler');
const {getPool} = require("../database");
const {authorisation} = require('../utils/jwtAuth');
const {checkError, validateFields, validateAll, validateString, validateNumber, validateId, validateRole} = require("../utils/validators");
const Groq = require("groq-sdk");

router.get('/', async (req, res) => {
    await handleGetQuery(res, process.env.PRODUCTS_QUERY);
});

router.get('/:id', async (req, res) => {
    await handleGetQuery(res, process.env.PRODUCTS_ID_QUERY, [{name: 'id', type: sql.Int, value: req.params.id}],);
});

router.get('/:id/seo-description', async (req, res) => {
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
});

router.post('/', authorisation, async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'worker'))) return;
    const required = ['name', 'description', 'price', 'weight', 'categoryId'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const {name, description, price, weight, categoryId} = req.body;
    try {
        const pool = await getPool();
        if (checkError(res, await validateAll(name, description, price, weight, categoryId, pool))) return;
        const request = pool.request();
        request.input('name', sql.VarChar, name);
        request.input('description', sql.VarChar, description);
        request.input('price', sql.Decimal(10, 2), price);
        request.input('weight', sql.Decimal(10, 3), weight);
        request.input('categoryId', sql.Int, categoryId);
        const result = await request.query(process.env.INSERT_PRODUCT);
        res.status(StatusCodes.CREATED).json({
            StatusCode: StatusCodes.CREATED, message: 'Product created', product: result.recordset[0]
        });
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
});

router.put('/:id', authorisation, async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'worker'))) return;
    const productId = parseInt(req.params.id, 10);
    const allowedFields = ['name', 'description', 'price', 'weight', 'categoryId'];
    const updateFields = Object.keys(req.body).filter(f => allowedFields.includes(f));
    if (updateFields.length === 0) {
        return sendHttp(res, StatusCodes.BAD_REQUEST, 'No valid fields to update!');
    }
    if (checkError(res, validateFields(allowedFields, req.body, "PUT"))) return;
    const {name, description, price, weight, categoryId} = req.body;
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, productId, process.env.CHECK_PRODUCT, 'product'))) return;
        const errors = [];
        if (name !== undefined) errors.push(validateString(name, 'name', 100));
        if (description !== undefined) errors.push(validateString(description, 'description'));
        if (price !== undefined) errors.push(validateNumber(price, 'price'));
        if (weight !== undefined) errors.push(validateNumber(weight, 'weight'));
        if (categoryId !== undefined) errors.push(await validateId(pool, categoryId, process.env.CHECK_CATEGORY, 'category'));
        if (checkError(res, errors.find(e => e != null))) return;
        const request = pool.request();
        const setClauses = [];
        request.input('productId', sql.Int, productId);

        if (name !== undefined) {
            request.input('name', sql.VarChar, name);
            setClauses.push('name = @name');
        }
        if (description !== undefined) {
            request.input('description', sql.VarChar, description);
            setClauses.push('description = @description');
        }
        if (price !== undefined) {
            request.input('price', sql.Decimal(10, 2), price);
            setClauses.push('price = @price');
        }
        if (weight !== undefined) {
            request.input('weight', sql.Decimal(10, 2), weight);
            setClauses.push('weight = @weight');
        }
        if (categoryId !== undefined) {
            request.input('categoryId', sql.Int, categoryId);
            setClauses.push('category_id = @categoryId');
        }
        const resultQuery = `${process.env.UPDATE_PRODUCT_START}
                                    SET ${setClauses.join(', ')}
                                    ${process.env.UPDATE_PRODUCT_END}`
        const result = await request.query(resultQuery);
        res.status(StatusCodes.CREATED).json({
            StatusCode: StatusCodes.CREATED, message: 'Product updated', product: result.recordset[0]
        });
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
});


module.exports = router;
