const express = require('express');
const router = express.Router();
const {getOrderController} = require("../controllers/getController");
const {setOrderController} = require("../controllers/orderController");

router.get('/', getOrderController.getAllOrders);
router.get('/status/:id', getOrderController.getOrderById);
router.post('/', setOrderController.createOrder);
router.patch('/:id', setOrderController.changeOrderStatus)
router.post('/:id/opinions', setOrderController.addOpinionToOrder);

module.exports = router;
