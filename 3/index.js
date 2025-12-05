require('dotenv').config();
const express = require('express');
const {getPool} = require('./database');
const {StatusCodes, getReasonPhrase} = require('http-status-codes');
const sql = require('mssql');
const app = express();
app.use(express.json({
    strict: true,
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf.toString());
        } catch (err) {
            err.status = StatusCodes.BAD_REQUEST;
            throw err;
        }
    }
}));

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === StatusCodes.BAD_REQUEST && 'body' in err) {
        return sendHttpError(res, StatusCodes.BAD_REQUEST,'Invalid JSON!');
    }
    next(err);
});

function sendHttpError(res, code, message) {
    const body = {
        status: code,
        statusText: getReasonPhrase(code),
        message: message
    };
    res.status(code).type('application/json').send(JSON.stringify(body, null, 2));
}

app.listen(3000, () => console.log("Serwer działa na http://localhost:3000"));

async function handleGetQuery(res, query, params = []) {
    try {
        const pool = await getPool();
        const request = pool.request();

        for (const param of params) {
            request.input(param.name, param.type, param.value);
        }
        const result = await request.query(query);
        if (params.length > 0 && result.recordset.length === 0) {
            return sendHttpError(res, StatusCodes.NOT_FOUND, 'Record not found');
        }
        res.status(StatusCodes.OK).json(result.recordset);
    } catch (err) {
        sendHttpError(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}


app.get('/', (req, res) => {
    res.send('Zadanie 3');
});

app.get('/products', async (req, res) => {
    await handleGetQuery(res, process.env.PRODUCTS_QUERY);
});

app.get('/products/:id', async (req, res) => {
    await handleGetQuery(res, process.env.PRODUCTS_ID_QUERY,
        [{name: 'id', type: sql.Int, value: req.params.id}],
    );
});

app.get('/categories', async (req, res) => {
    await handleGetQuery(res, process.env.CATEGORY_QUERY);
});

app.get('/orders', async (req, res) => {
    await handleGetQuery(res, process.env.ORDERS_QUERY);
})

app.get('/orders/status/:id', async (req, res) => {
    await handleGetQuery(res, process.env.ORDERS_ID_QUERY,
        [{name: 'id', type: sql.Int, value: req.params.id}],
    );
});

app.get('/status', async (req, res) => {
    await handleGetQuery(res, process.env.STATUS_QUERY);
})

app.post('/products', async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return sendHttpError(res, StatusCodes.BAD_REQUEST,
            'Request body must be valid JSON with fields: name, price, weight, categoryId');
    }

    const {name, price, weight, categoryId} = req.body;
    const required = ['name', 'price', 'weight', 'categoryId'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length > 0) {
        return sendHttpError(res, StatusCodes.BAD_REQUEST, `Missing required fields: ${missing.join(', ')}`);
    }
    const extra = Object.keys(req.body).filter(f => !required.includes(f));
    if (extra.length > 0) {
        return sendHttpError(res, StatusCodes.BAD_REQUEST,
            `Unexpected fields: ${extra.join(', ')}`);
    }
    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('name', sql.VarChar, name);
        request.input('price', sql.Decimal(10,2), price);
        request.input('weight', sql.Decimal(10,2), weight);
        request.input('categoryId', sql.Int, categoryId);
        const result = await request.query(process.env.INSERT_PRODUCT);
        res.status(StatusCodes.CREATED).json({
            message: 'Product created',
            product: result.recordset[0]
        });
    } catch (err) {
        sendHttpError(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
});