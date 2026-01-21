require('dotenv').config();
const {getPool} = require('../utils/database');
const {StatusCodes} = require('http-status-codes');
const {sendHttp} = require('../utils/errorHandler');
const sql = require("mssql");
const fs = require("fs");
const csv = require("csv-parser");
const {
    checkError, validateFields, validateAll, validateString, validateNumber, validateId, validateRole
} = require("../utils/validators");


exports.postProduct = async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'worker'))) return;
    const required = ['name', 'price', 'weight', 'categoryId'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const {name, price, weight, categoryId} = req.body;
    try {
        const pool = await getPool();
        if (checkError(res, await validateAll(name, price, weight, categoryId, pool))) return;
        const request = pool.request();
        request.input('name', sql.VarChar, name);
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
}

exports.updateProduct = async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'worker'))) return;
    const productId = parseInt(req.params.id, 10);
    const allowedFields = ['name', 'description', 'price', 'weight', 'categoryId'];
    const updateFields = Object.keys(req.body || {}).filter(f => allowedFields.includes(f));
    if (updateFields.length === 0) {
        return sendHttp(res, StatusCodes.BAD_REQUEST, 'No valid fields to update!');
    }
    if (checkError(res, validateFields(allowedFields, req.body, "PUT"))) return;
    const {name, description, price, weight, categoryId} = req.body || {};
    try {
        const pool = await getPool();
        if (checkError(res, await validateId(pool, productId, process.env.CHECK_PRODUCT, 'product'))) return;
        const errors = [];
        if (name !== undefined) errors.push(validateString(name, 'name', 100));
        if (description !== undefined) errors.push(validateString(description, 'description'));
        if (price !== undefined) errors.push(validateNumber(price, 'price'));
        if (weight !== undefined) errors.push(validateNumber(weight, 'weight'));
        if (categoryId !== undefined) errors.push(await validateId(pool, categoryId, process.env.CHECK_CATEGORY, 'category'));
        if (checkError(res, errors.find(e => e))) return;
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
}

exports.initializeDatabase = async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'worker'))) return;

    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
        return sendHttp(res, StatusCodes.BAD_REQUEST, 'No data to initialize DB!');
    }

    try {
        const pool = await getPool();

        const result = await pool.query(process.env.PRODUCTS_QUERY);
        if (result.recordset.length > 0) {
            return sendHttp(res, StatusCodes.BAD_REQUEST, 'Unable to process - products already exist in the database');
        }

        const validationErrors = [];
        for (const [index, p] of products.entries()) {
            if (!p.name || p.price === undefined || p.weight === undefined || !p.category_id) {
                validationErrors.push(`Row ${index + 1}: Missing fields`);
                continue;
            }

            const err = await validateAll(p.name, p.price, p.weight, p.category_id, pool);
            if (err) validationErrors.push(`Row ${index + 1}: ${err}`);
        }

        if (validationErrors.length > 0) {
            return sendHttp(res, StatusCodes.BAD_REQUEST, `Validations errors: ${validationErrors.join(', ')}`);
        }

        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            for (const product of products) {
                const request = transaction.request();
                request.input('name', sql.VarChar, product.name);
                request.input('description', sql.VarChar, product.description || '');
                request.input('price', sql.Decimal(10, 2), product.price);
                request.input('weight', sql.Decimal(10, 3), product.weight);
                request.input('categoryId', sql.Int, product.category_id);

                await request.query(process.env.INSERT_PRODUCT);
            }
            await transaction.commit();
            return sendHttp(res, StatusCodes.OK, 'Products initialized');

        } catch (err) {
            await transaction.rollback();
            return sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `DB error: ${err.message}`);
        }

    } catch (err) {
        return sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}