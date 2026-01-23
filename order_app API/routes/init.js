const express = require('express');
const router = express.Router();
const {authorisation} = require("../utils/jwtAuth");
const {initializeDatabase} = require('../controllers/productsController');

router.post('/', authorisation, initializeDatabase);

module.exports = router;