require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, trustServerCertificate: true
    },
    port: parseInt(process.env.DB_PORT, 10)
};

async function getPool() {
    try {
        return await new sql.ConnectionPool(config).connect();
    } catch (err) {
        throw err;
    }
}

module.exports = {sql, getPool};