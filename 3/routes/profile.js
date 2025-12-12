const express = require('express');
const router = express.Router();
const {getController} = require('../controllers/authController');
const {authorisation} = require('../utils/jwtAuth');

router.get('/', authorisation, getController.getProfile);

module.exports = router;
