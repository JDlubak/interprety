const jwt = require('jsonwebtoken');
const {StatusCodes} = require('http-status-codes');
const {sendHttp} = require("./errorHandler");

function authorisation(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendHttp(res, StatusCodes.UNAUTHORIZED, "Missing token");
    }

    const token = authHeader.split(' ')[1];

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return sendHttp(res, StatusCodes.UNAUTHORIZED, "Invalid or expired token");
    }
}

module.exports = {authorisation};