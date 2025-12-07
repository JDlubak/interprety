const sql = require("mssql");

function validateFields(fieldsList, body, method) {
    if (!body || typeof body !== 'object') {
        return (`Request body must be valid JSON with fields: ${fieldsList.join(', ')}`);
    }
    if (method === 'POST') {
        const missing = fieldsList.filter(f => !body[f]);
        if (missing.length > 0) {
            return (`Missing required fields: ${missing.join(', ')}`);
        }
    }
    const extra = Object.keys(body).filter(f => !fieldsList.includes(f));
    if (extra.length > 0) {
        return (`Unexpected fields: ${extra.join(', ')}`);
    }
    return null;
}

async function validateAll(name, description, price, weight, categoryId, pool) {
    const errors = [validateString(name, 'name', 100), validateString(description, 'description'), validateNumber(price, 'price'), validateNumber(weight, 'weight'), await validateId(pool, categoryId, process.env.CHECK_CATEGORY, 'category')]
    const error = errors.find(e => e !== null);
    return error ? error : null;
}

function validateString(value, fieldName, maxLength = null) {
    if (typeof value !== 'string') {
        return (`Field ${fieldName} must be a string`);
    }
    if (value.trim().length === 0) {
        return (`Field ${fieldName} must be a non-empty string`);
    }
    if (maxLength && value.length > 100) {
        return (`Field ${fieldName} must not exceed 100 characters`);
    }
    return null
}

function validateNumber(value, fieldName, isInteger = false) {
    if (typeof value !== 'number' || isNaN(value)) {
        return (`Field ${fieldName} must be a valid number`);
    }
    if (value < 0) {
        return (`Field ${fieldName} must be a positive number`);
    }
    if (isInteger && !Number.isInteger(value)) {
        return (`Field ${fieldName} must be an integer`);
    }
    return null;
}

async function validateId(pool, id, query, fieldName) {
    if (!Number.isInteger(id)) {
        return (`Field ${fieldName}Id must be an integer`);
    }
    const idCheck = await pool.request()
        .input(`${fieldName}Id`, sql.Int, id)
        .query(query);
    if (idCheck.recordset.length === 0) {
        return (`A ${fieldName} with id ${id} does not exist`);
    }
    return null;
}

async function validateItems(items, pool) {
    if (!Array.isArray(items) || items.length === 0) {
        return ('Items must be a non-empty array');
    }
    const errors = [];
    for (const [index, {productId, quantity, unit_price, vat, discount}] of items.entries()) {
        let err = await validateId(pool, productId, process.env.CHECK_PRODUCT, 'product');
        if (err) errors.push(`Item ${index + 1}: ${err}`);
        err = validateNumber(quantity, 'quantity', true);
        if (err) errors.push(`Item ${index + 1}: ${err}`);
        err = validateNumber(unit_price, 'unit_price')
        if (err) errors.push(`Item ${index + 1}: ${err}`);
        if (vat !== undefined) {
            err = validateNumber(vat, 'vat');
            if (err) errors.push(`Item ${index + 1}: ${err}`);
        }
        if (discount!== undefined) {
            err = validateNumber(discount, 'discount');
            if (err) errors.push(`Item ${index + 1}: ${err}`);
        }
    }
    return errors.length > 0 ? errors.join('; ') : null;
}

module.exports = {validateFields, validateAll, validateString, validateNumber, validateId, validateItems};
