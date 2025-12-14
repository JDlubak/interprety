const jwt = require('jsonwebtoken');
const {StatusCodes} = require('http-status-codes');
const {sendHttp} = require("./errorHandler");
const {getPool} = require("./database")
const sql = require("mssql");


async function authorisation(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendHttp(res, StatusCodes.UNAUTHORIZED, "Missing token");
    }

    const token = authHeader.split(' ')[1];

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        const pool = await getPool();
        const request = pool.request();
        request.input('id', sql.Int, req.user.id);
        const result = await request.query(process.env.GET_LATEST_ACCESS_TOKEN);
        const latestToken = result.recordset[0]?.latest_access_token;
        if (!latestToken) {
            return sendHttp(res, StatusCodes.UNAUTHORIZED, "User no longer exists");
        }
        if (latestToken !== token) {
            return sendHttp(res, StatusCodes.UNAUTHORIZED, "This token is no longer valid - please use the one from your last login attempt or refresh");
        }
        next();
    } catch (err) {
        return sendHttp(res, StatusCodes.UNAUTHORIZED, "Invalid or expired token");
    }
}

module.exports = {authorisation};