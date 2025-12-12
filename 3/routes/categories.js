const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/getController');

router.get('/', categoriesController.getAllCategories);

module.exports = router;
