require('dotenv').config();
const express = require('express');
const router = express.Router();
const {handleGetQuery} = require('../utils/getQueryHandler')


router.get('/', async (req, res) => {
    await handleGetQuery(res, process.env.CATEGORY_QUERY);
});

module.exports = router;
