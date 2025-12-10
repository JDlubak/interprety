const {getPool} = require('../database');
const {StatusCodes} = require('http-status-codes');
const {sendHttp} = require('./errorHandler');

async function handleGetQuery(res, query, params = []) {
    try {
        const pool = await getPool();
        const request = pool.request();

        for (const param of params) {
            request.input(param.name, param.type, param.value);
        }
        const result = await request.query(query);
        if (params.length > 0 && result.recordset.length === 0) {
            const idParam = params.find(p => p.name === 'id');
            const idValue = idParam ? idParam.value : undefined;
            return sendHttp(res, StatusCodes.NOT_FOUND, `Record with id ${idValue} not found`);
        }
        return sendHttp(res, StatusCodes.OK, result.recordset);
    } catch (err) {
        sendHttp(res, StatusCodes.INTERNAL_SERVER_ERROR, `Server error: ${err.message}`);
    }
}

module.exports = {handleGetQuery};
