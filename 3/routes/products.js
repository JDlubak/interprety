const express = require('express');
const router = express.Router();
const {authorisation} = require('../utils/jwtAuth');
const {getProductsController} = require('../controllers/getController');
const {setProductsController} = require('../controllers/productsController');

router.get('/', getProductsController.getAllProducts);
router.get('/:id', getProductsController.getProductById);
router.get('/:id/seo-description', getProductsController.getProductSeoDescription);
router.post('/', authorisation, setProductsController.postProduct);
router.put('/:id', authorisation, setProductsController.updateProduct);

module.exports = router;
