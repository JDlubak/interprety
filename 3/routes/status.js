require('dotenv').config();
const express = require('express');
const router = express.Router();
const {statusController} = require('../controllers/getController');

router.get('/', statusController.getAllStatuses);

module.exports = router;
