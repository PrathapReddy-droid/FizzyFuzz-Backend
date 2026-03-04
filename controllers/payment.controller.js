// controllers/payment.controller.js

import razorpay from "../utils/razorpay.js";
import OrderModel from "../models/order.model.js";
import crypto from "crypto";
import { createShiprocketOrder } from "../utils/shiprocketService.js";
import ProductModel from "../models/product.modal.js";
import UserModel from "../models/user.model.js";
import AddressModel from "../models/address.model.js";


export const createRazorpayOrder = async (req, res) => {
                console.log(req.body,"=================>>>")


        const { paymentId } = req.body;

 const order = await OrderModel.findOne({ paymentId: paymentId });
        console.log(order)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: order.totalAmt * 100, // paise
            currency: "INR",
            receipt: order.orderId       });
        console.log(razorpayOrder,"==========================>>>>")

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

         const event = req.body

        if (event.payment.entity.status === "captured") {

            const payment = req.body.payment.entity
  

            const receipt = payment.notes?.receipt || payment.order_id;

            const order = await OrderModel.findOne({
                orderId: payment.order_id
            });
            console.log(order)

            if (order) {

                order.payment_status = "paid";
                order.paymentId = payment.id;

              const order1 =  await order.save();
              console.log(order1,order)
                const products = order.products
                const address = await AddressModel.findOne({userId:order.userId});
            try {
                for (const item of products) {
                    const user = await UserModel.findById(order.userId);
                    const product = await ProductModel.findById(item.productId);
                    const pickup = await UserModel.findById(product.seller);
                    const shiprocketRes = await createShiprocketOrder({
                        pickup,
                        product,
                        order,
                        address,
                        user
                    });

                if (shiprocketRes.success) {
                    const sr = shiprocketRes.data;

                    await OrderModel.findByIdAndUpdate(
                            order._id,
                            {
                                $push: {
                                shipment: {
                                    shiprocket_order_id: sr?.order_id,
                                    shipment_id: sr?.shipment_id,
                                    status: "CONFIRMED",
                                    raw_response: sr
                                }
                                }
                            }
                            );

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
