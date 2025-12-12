const express = require('express');
const router = express.Router();
const {authorisation} = require("../utils/jwtAuth");

const {productsController} = require('../controllers/productsController');
router.post('/', authorisation, productsController.initializeDatabase);

module.exports = router;