const sql = require("mssql");
const {sendHttp} = require("./errorHandler");
const {StatusCodes} = require('http-status-codes');

function validateFields(fieldsList, body, method) {
    if (!body || typeof body !== 'object') {
        return (`Request body must be valid JSON with fields: ${fieldsList.join(', ')}`);
    }
    if (method === 'POST' || method === 'PATCH') {
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

async function validateAll(name, price, weight, categoryId, pool) {
    const errors = [validateString(name, 'name', 100), validateNumber(price, 'price'), validateNumber(weight, 'weight'), await validateId(pool, categoryId, process.env.CHECK_CATEGORY, 'category')]
    const error = errors.find(e => e !== null);
    return error ? error : null;
}

function validateString(value, fieldName, maxLength = null) {
    if (typeof value !== 'string') {
        return (`Field ${fieldName} must be a string`);
    }
    if (value.trim().length === 0 && fieldName !== 'description') {
        return (`Field ${fieldName} must be a non-empty string`);
    }
    if (maxLength && value.length > maxLength) {
        return (`Field ${fieldName} must not exceed ${maxLength} characters`);
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
    if (fieldName === 'vat' && value > 30) {
        return (`Field vat must be in range 0-30`);
    }
    if (fieldName === 'discount' && value > 1) {
        return (`Field discount must be in range 0-1`);
    }
    if (fieldName === ('rating') && (value < 1 || value > 5)) {
        return (`Field rating must be in range 1-5`);
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

async function validateEmail(value, pool) {
    if (typeof value !== 'string') {
        return (`Field email must be a string`);
    }
    if (value.length > 100) {
        return ('Field email must not exceed 100 characters');
    }
    if (value !== value.toLowerCase()) {
        return ('Email must contain only lowercase letters');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        return (`Field email must be a valid email in format xxx@domain.com`);
    }
    const request = await pool.request();
    const result = await request.query(process.env.GET_EMAILS);
    if (result.recordset.some(row => row.email === value)) {
        return ('You cannot use this email to create another account!')
    }
    return null;
}

async function validatePhone(value, pool) {
    if (typeof value !== 'string') {
        return `Field phone must be a string`;
    }
    const phoneRegex = /^\d{3}-\d{3}-\d{3}$/;
    if (!phoneRegex.test(value)) {
        return (`Field phone must be 9 numbers separated by '-' in format XXX-XXX-XXX`);
    }
    const request = await pool.request();
    const result = await request.query(process.env.GET_PHONES);
    if (result.recordset.some(row => row.phone === value)) {
        return ('You cannot use this phone to create another account!')
    }
    return null;
}

async function validateItems(items, pool) {
    if (!Array.isArray(items) || items.length === 0) {
        return ('Items must be a non-empty array');
    }
    const allowedFields = ['productId', 'quantity', 'unitPrice', 'discount', 'vat']
    const errors = [];
    for (const [index, item] of items.entries()) {
        const unknownFields = Object.keys(item).filter(field => !allowedFields.includes(field));
        if (unknownFields.length > 0) {
            errors.push(`Item ${index + 1}: Unknown fields: ${unknownFields.join(', ')}`)
        }
        let err;
        const {productId, quantity, unitPrice, vat, discount} = item;
        if (productId === undefined) {
            errors.push(`Item ${index + 1}: productId is required`);
        } else {
            err = await validateId(pool, productId, process.env.CHECK_PRODUCT, 'product');
            if (err) errors.push(`Item ${index + 1}: ${err}`);
        }
        if (quantity === undefined) {
            errors.push(`Item ${index + 1}: quantity is required`);
        } else {
            err = validateNumber(quantity, 'quantity', true);
            if (err) errors.push(`Item ${index + 1}: ${err}`);
        }
        if (unitPrice === undefined) {
            errors.push(`Item ${index + 1}: unitPrice is required`);
        } else {
            err = validateNumber(unitPrice, 'unitPrice')
            if (err) errors.push(`Item ${index + 1}: ${err}`);
        }
        if (vat !== undefined) {
            err = validateNumber(vat, 'vat');
            if (err) errors.push(`Item ${index + 1}: ${err}`);
        }
        if (discount !== undefined) {
            err = validateNumber(discount, 'discount');
            if (err) errors.push(`Item ${index + 1}: ${err}`);
        }
    }
    return errors.length > 0 ? errors.join('; ') : null;
}

async function validateStatus(pool, value, orderId) {
    const available = ['CANCELLED', 'COMPLETED', 'CONFIRMED', 'UNCONFIRMED'];
    if (!available.includes(value)) {
        return ('Provided status is incorrect. Use: CANCELLED|COMPLETED|CONFIRMED|UNCONFIRMED');
    }
    const request = await pool.request();
    request.input('status', sql.VarChar(30), value);
    request.input('orderId', sql.Int, orderId);
    const result = await request.query(process.env.CHECK_ORDER_STATUS);
    const {status} = result.recordset[0];
    if (status === "CANCELLED" || status === "COMPLETED") {
        return (`This order has been ${status} - further changes are not allowed`)
    }
    if (status === value) {
        return (`Order is already ${status} - unable to change to the same status`)
    }
    if (status === "UNCONFIRMED" && value === "COMPLETED") {
        return ('This order cannot be COMPLETED, as it is still UNCONFIRMED')
    }
    if (status === "CONFIRMED" && value === "UNCONFIRMED") {
        return ('This order has been CONFIRMED - unable to revert back to UNCONFIRMED');
    }
    return null
}

async function validateLogin(pool, login) {
    if (login.length < 8) {
        return ('Login needs to be at least 8 characters long');
    }
    const potentialError = validateString(login, 'login', 30);
    if (potentialError) return potentialError;
    if (!/^[a-zA-Z0-9_]+$/.test(login)) {
        return 'Login can only contain letters, numbers and underscores';
    }
    const request = await pool.request();
    request.input('login', sql.VarChar(30), login);
    const result = await request.query(process.env.CHECK_LOGIN);
    if (result.recordset.length > 0) {
        return (`This login is already taken, choose another one or proceed to login`)
    }
    return null;
}

function validatePassword(password) {
    if (typeof password !== 'string') return 'Password must be a string';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return null;
}

function checkError(res, errorMessage) {
    if (errorMessage != null) {
        sendHttp(res, StatusCodes.BAD_REQUEST, errorMessage);
        return true;
    }
    return false;
}

function validateRole(role, expectedRole) {
    if (role !== expectedRole) {
        return (`This action is supposed to be performed only by ${expectedRole}s - you are ${role}`);
    }
    return null;
}

async function validateOrder(pool, orderId, userId) {
    const request = await pool.request();
    request.input('orderId', sql.Int, orderId);
    request.input('userId', sql.Int, userId);
    const result = await request.query(process.env.CHECK_ORDER_CUSTOMER);
    if (result.recordset.length === 0) {
        return ("You are not allowed to post opinions on this order");
    }
    const orderStatus = result.recordset[0].status;
    if (orderStatus === "CANCELLED" || orderStatus === "COMPLETED") {
        return null;
    }
    return (`To post opinion, order needs to be COMPLETED or CANCELLED - this one is still ${orderStatus}`);
}

module.exports = {
    checkError,
    validateFields,
    validateAll,
    validateString,
    validateNumber,
    validateId,
    validateItems,
    validateEmail,
    validatePhone,
    validateStatus,
    validateLogin,
    validatePassword,
    validateRole,
    validateOrder
};
