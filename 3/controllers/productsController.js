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
    const required = ['file'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const {file} = req.body;
    if (!fs.existsSync(file)) {
        return sendHttp(res, StatusCodes.BAD_REQUEST, 'File not found on server');
    }
    if (!file.toLowerCase().endsWith('.csv')) {
        return sendHttp(res, StatusCodes.BAD_REQUEST, 'File must have .csv extension');
    }
    try {
        const pool = await getPool();
        const result = await pool.query(process.env.PRODUCTS_QUERY);
        if (result.recordset.length > 0) {
            return sendHttp(res, StatusCodes.BAD_REQUEST, 'Unable to process - products already exist in the database');
        }
        const products = [];
        fs.createReadStream(file)
            .pipe(csv())
            .on('data', (row) => {
                if (!row.name || !row.description || !row.price || !row.weight || !row.category_id) {
                    throw new Error('Missing required fields');
                }
                products.push({
                    name: row.name,
                    description: row.description || '',
                    price: parseFloat(row.price),
                    weight: parseFloat(row.weight),
                    categoryId: parseInt(row.category_id)
                });
            })
            .on('error', (err) => {
                return sendHttp(res, StatusCodes.BAD_REQUEST, 'CSV read error: Make sure you uploaded proper .csv file');
            })
            .on('end', async () => {
                const errors = [];
                for (const [index, row] of products.entries()) {
                    let err = await validateAll(row.name, row.description, row.price, row.weight, row.categoryId, pool);
                    if (err) errors.push(`Row ${index + 1}: ${err}`);
                }
                if (errors.length > 0) {
                    return sendHttp(res, StatusCodes.BAD_REQUEST, `Validation failed: ${errors.join(', ')}`);
                }
                const transaction = new sql.Transaction(pool);
                try {
                    await transaction.begin();
                    for (const product of products) {
                        const request = transaction.request();
                        request.input('name', sql.VarChar, product.name);
                        request.input('description', sql.VarChar, product.description);
                        request.input('price', sql.Decimal(10, 2), product.price);
                        request.input('weight', sql.Decimal(10, 3), product.weight);
                        request.input('categoryId', sql.Int, product.categoryId);
                        await request.query(process.env.INSERT_PRODUCT);
                    }
                    await transaction.commit();
                    return sendHttp(res, StatusCodes.OK, 'Products initialized');
                } catch (err) {
                    await transaction.rollback();
                    return sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `DB error: ${err.message}`);

                }
            });
    } catch (err) {
        return sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}