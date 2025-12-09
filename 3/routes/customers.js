require('dotenv').config();
const express = require('express');
const router = express.Router();
const {handleGetQuery} = require('../utils/getQueryHandler')
const sql = require("mssql");

// Ten route na razie jest stosunkowo głupi,
// bo każdy może bardzo łatwo podejrzeć wszystkie informacje o wszystkich klientach,
// w przyszłości będzie do przerobienia
router.get('/', async (req, res) => {
    await handleGetQuery(res, process.env.CUSTOMER_QUERY);
});

router.get('/:id', async (req, res) => {
    await handleGetQuery(res, process.env.CUSTOMER_ID_QUERY, [{name: 'id', type: sql.Int, value: req.params.id}],);
});

module.exports = router;
