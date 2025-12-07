require('dotenv').config();
const express = require('express');
const router = express.Router();
const {handleGetQuery} = require('../utils/getQueryHandler')
const sql = require("mssql");

router.get('/', async (req, res) => {
    await handleGetQuery(res, process.env.ORDERS_QUERY);
})

router.get('/status/:id', async (req, res) => {
    await handleGetQuery(res, process.env.ORDERS_ID_QUERY,
        [{name: 'id', type: sql.Int, value: req.params.id}],
    );
});

module.exports = router;
