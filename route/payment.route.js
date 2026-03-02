import { Router } from "express";
import auth from "../middlewares/auth.js";
import { createRazorpayOrder, razorpayWebhook } from "../controllers/payment.controller.js";

const paymentRouter = Router();
paymentRouter.post('/create',auth,createRazorpayOrder)
paymentRouter.post('/weebhook',razorpayWebhook)



export default paymentRouter;