const express = require('express');
const router = express.Router();
const {getProfile} = require('../controllers/getController');
const {authorisation} = require('../utils/jwtAuth');

router.get('/', authorisation, getProfile);

module.exports = router;
