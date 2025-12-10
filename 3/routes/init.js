const express = require('express');
const sql = require("mssql");
const fs = require("fs");
const csv = require('csv-parser')
const router = express.Router();
const {validateFields, validateAll, checkError } = require('../utils/validators');
const {getPool} = require("../database");
const {StatusCodes} = require("http-status-codes");
const {sendHttp} = require("../utils/errorHandler");
const {authorisation} = require("../utils/jwtAuth");

router.post('/', authorisation, async (req, res) => {
    if (req.user.role !== "worker") {
        return sendHttp(res, StatusCodes.FORBIDDEN, 'Only workers can initialize products');
    }
    const required = ['file'];
    if (checkError(res, validateFields(required, req.body, "POST"))) return;
    const { file } = req.body;
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
})

module.exports = router;