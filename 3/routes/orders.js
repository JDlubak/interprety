const express = require('express');
const router = express.Router();
const {authorisation} = require('../utils/jwtAuth');
const {getAllOrders, getOrderById} = require("../controllers/getController");
const {createOrder, changeOrderStatus, addOpinionToOrder} = require("../controllers/orderController");

router.get('/', authorisation, getAllOrders);
router.get('/status/:id', authorisation, getOrderById);
router.post('/', authorisation, createOrder);
router.patch('/:id', authorisation, changeOrderStatus)
router.post('/:id/opinions', authorisation, addOpinionToOrder);

module.exports = router;
