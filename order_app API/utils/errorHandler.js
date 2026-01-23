const {getReasonPhrase} = require('http-status-codes')

function sendHttp(res, code, message) {
    const body = {
        status: code, statusText: getReasonPhrase(code), message: message
    };
    res.status(code).type('application/json').send(JSON.stringify(body, null, 2));
}

module.exports = {sendHttp};
