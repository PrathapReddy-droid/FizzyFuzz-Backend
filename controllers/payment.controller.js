// controllers/payment.controller.js

import razorpay from "../utils/razorpay.js";
import OrderModel from "../models/order.model.js";

export const createRazorpayOrder = async (req, res) => {
    try {

        const { paymentId } = req.body;

        const order = await OrderModel.findById(paymentId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: order.totalAmt * 100, // paise
            currency: "INR",
            receipt: order._id.toString()
        });
        console.log(razorpayOrder,"==========================>>>>")

        // Save razorpay order id
        order.payment_status = "pending";
        order.orderId = razorpayOrder.id;
        await order.save();

        res.json({
            key: process.env.RAZORPAY_KEY_ID,
            order: razorpayOrder
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


import crypto from "crypto";
import OrderModel from "../models/order.model.js";
import { createShiprocketOrder } from "./shiprocket.controller.js";

export const razorpayWebhook = async (req, res) => {
    try {

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        const signature = req.headers["x-razorpay-signature"];

        const generatedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(JSON.stringify(req.body))
            .digest("hex");

        if (generatedSignature !== signature) {
            return res.status(400).json({ message: "Invalid signature" });
        }

        const event = req.body.event;

        if (event === "payment.captured") {

            const payment = req.body.payload.payment.entity;

            const receipt = payment.notes?.receipt || payment.order_id;

            const order = await OrderModel.findOne({
                paymentId: payment.order_id
            });

            if (order) {

                order.payment_status = "paid";
                order.paymentId = payment.id;

                await order.save();

                // ✅ Automatically create Shiprocket order
                await createShiprocketOrder(order._id);
            }

        }

        if (event === "payment.failed") {

            const payment = req.body.payload.payment.entity;

            await OrderModel.findOneAndUpdate(
                { paymentId: payment.order_id },
                { payment_status: "failed" }
            );
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
