require('dotenv').config();
const express = require('express');
const {StatusCodes} = require('http-status-codes');
const {sendHttp} = require('./utils/errorHandler');
const { authorisation } = require('./utils/jwtAuth');
const app = express();

app.use(express.json({
    strict: true, verify: (req, res, buf) => {
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
const registerRouter = require('./routes/register');
const loginRouter = require('./routes/login');
const refreshRouter = require('./routes/refresh');


app.use('/products', authorisation, productsRouter);
app.use('/categories', authorisation, categoriesRouter);
app.use('/orders', authorisation, ordersRouter);
app.use('/status', authorisation, statusRouter);
app.use('/customers', authorisation, customersRouter);
app.use('/register', registerRouter);
app.use('/login', loginRouter);
app.use('/refresh', refreshRouter);




app.get('/', (req, res) => {
    sendHttp(res, StatusCodes.OK, 'Zadanie 3');
});

app.use((req, res) => {
    sendHttp(res, StatusCodes.NOT_FOUND, `Route ${req.method} ${req.url} not found`);
});

app.listen(3000, () => console.log("Serwer działa na http://localhost:3000"));
