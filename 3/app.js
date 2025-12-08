require('dotenv').config();
const express = require('express');
const {StatusCodes} = require('http-status-codes');
const {sendHttp} = require('./utils/errorHandler');
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
    if (err instanceof SyntaxError && 'body' in err) {
        return sendHttp(res, StatusCodes.BAD_REQUEST, 'Invalid JSON!');
    }
    next(err);
});

const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const ordersRouter = require('./routes/orders');
const statusRouter = require('./routes/status');
const customersRouter = require('./routes/customers');


app.use('/products', productsRouter);
app.use('/categories', categoriesRouter);
app.use('/orders', ordersRouter);
app.use('/status', statusRouter);
app.use('/customers', customersRouter);


app.get('/', (req, res) => {
    sendHttp(res, StatusCodes.OK, 'Zadanie 3');
});

app.use((req, res) => {
    sendHttp(res, StatusCodes.NOT_FOUND, `Route ${req.method} ${req.url} not found`);
});

app.listen(3000, () => console.log("Serwer działa na http://localhost:3000"));
