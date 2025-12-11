require('dotenv').config();
const express = require('express');
const router = express.Router();
const {handleGetQuery} = require('../utils/getQueryHandler')
const {validateRole, checkError} = require('../utils/validators');
const {authorisation} = require('../utils/jwtAuth');
const sql = require("mssql");

router.get('/', authorisation, async (req, res) => {
    if (checkError(res, validateRole(req.user.role, 'customer'))) return;
    await handleGetQuery(res, process.env.CUSTOMER_QUERY, [{name: 'id', type: sql.Int, value: req.user.id}]);
});


module.exports = router;
