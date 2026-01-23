const express = require('express');
const router = express.Router();
const {authorisation} = require('../utils/jwtAuth');
const {getAllProducts, getProductById, getProductSeoDescription} = require('../controllers/getController');

const {postProduct, updateProduct} = require('../controllers/productsController');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.get('/:id/seo-description', getProductSeoDescription);
router.post('/', authorisation, postProduct);
router.put('/:id', authorisation, updateProduct);

module.exports = router;
