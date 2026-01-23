const express = require('express');
const router = express.Router();
const {getAllCategories} = require('../controllers/getController');

router.get('/', getAllCategories);

module.exports = router;
