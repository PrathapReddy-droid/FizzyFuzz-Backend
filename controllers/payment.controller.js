// controllers/payment.controller.js

import razorpay from "../utils/razorpay.js";
import OrderModel from "../models/order.model.js";
import crypto from "crypto";
import { createShiprocketOrder, generateSubOrderId } from "../utils/shiprocketService.js";
import ProductModel from "../models/product.modal.js";
import UserModel from "../models/user.model.js";
import AddressModel from "../models/address.model.js";
import mongoose from "mongoose";


export const createRazorpayOrder = async (req, res) => {
    console.log(req.body, "=================>>>")


    const { paymentId } = req.body;

    const order = await OrderModel.findOne({ paymentId: paymentId });
    console.log(order)

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    const razorpayOrder = await razorpay.orders.create({
        amount: order.totalAmt * 100, // paise
        currency: "INR",
        receipt: order.orderId
    });
    console.log(razorpayOrder, "==========================>>>>")

    // Save razorpay order id
    order.payment_status = "pending";
    order.orderId = razorpayOrder.id;
    await order.save();

    res.json({
        key: process.env.RAZORPAY_KEY_ID,
        order: razorpayOrder
    });


};




export const razorpayWebhook = async (req, res) => {
    try {
        // console.log(req,"------------------------------req")
        // console.log(res,"--------------------------------res")

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        const signature = req.headers["x-razorpay-signature"];

        // const generatedSignature = crypto
        //     .createHmac("sha256", webhookSecret)
        //     .update(JSON.stringify(req.body))
        //     .digest("hex");

        // if (generatedSignature !== signature) {
        //     return res.status(400).json({ message: "Invalid signature" });
        // }

        const event = req.body.payload
        console.log(event)

        if (event.payment.entity.status === "captured") {

            const payment = req.body.payload.payment.entity
            console.log(payment.order_id, "=======")


            const receipt = payment.notes?.receipt || payment.order_id;

            const order = await OrderModel.findOne({
                orderId: payment.order_id
            });
            console.log(order, "=====success")

            if (order) {

                order.payment_status = "paid";
                order.paymentId = payment.id;

                await order.save();
                console.log(order)
                const products = order.products
                const address = await AddressModel.findOne({ userId: order.userId });
                try {
                    for (const item of products) {
                        const user = await UserModel.findById(order.userId);
                        const product = await ProductModel.findById(item.productId);
                        const sub_id = await generateSubOrderId()
                        product.sub_id = sub_id
                        const pickup = await UserModel.findById(product.seller);
                        const shiprocketRes = await createShiprocketOrder({
                            pickup,
                            product: item,
                            order,
                            address,
                            user
                        });
                        console.log(shiprocketRes);
                        if (shiprocketRes.success) {
                            const sr = shiprocketRes.data;
                            console.log(item.productId);

                            let data = await OrderModel.updateOne(
                                {
                                    _id: order._id,
                                    "products.productId": item.productId
                                },
                                {
                                    $set: {
                                        "products.$.sub_id": sub_id ,
                                        "products.$.shipment": {
                                            shiprocket_order_id: sr?.order_id,
                                            shipment_id: sr?.shipment_id,
                                            status: "CONFIRMED",
                                            raw_response: sr
                                        }
                                    }
                                }
                            );

                            console.log(data);



                        } else {
                            console.error("Shiprocket Error:", shiprocketRes.message);
                            await OrderModel.findByIdAndUpdate(order._id, {
                                "mischief": "something went wrong in shipment"
                            });
                        }
                        await ProductModel.findByIdAndUpdate(product._id, {
                            $inc: {
                                countInStock: -item.quantity,
                                sale: item.quantity
                            }
                        });
                    }


                } catch (shipErr) {
                    console.error("Shiprocket Integration Failed:", shipErr.message);
                }
                // ✅ Automatically create Shiprocket order
                // await createShiprocketOrder(order._id);
            }

        }

        if (event === "payment.failed") {

            const payment = req.body.payload.payment.entity;

            await OrderModel.findOneAndUpdate(
                { paymentId: payment.order_id },
                { payment_status: "failed" }
            );
        }

        res.status(200).json({ success: false });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
