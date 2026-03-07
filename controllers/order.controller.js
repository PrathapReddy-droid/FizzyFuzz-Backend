import OrderModel from "../models/order.model.js";
import ProductModel from '../models/product.modal.js';
import UserModel from '../models/user.model.js';
import paypal from "@paypal/checkout-server-sdk";
import OrderConfirmationEmail from "../utils/orderEmailTemplate.js";
import sendEmailFun from "../config/sendEmail.js";
import decoder from "../middlewares/decoder.js";
import { cancelShiprocketOrder, createShiprocketOrder, generateOrderId, generateSubOrderId } from "../utils/shiprocketService.js";
import AddressModel from "../models/address.model.js";
import { reduceWallet } from "../utils/wallets.js";

export const createOrderController = async (request, response) => {
    try {
        const { products, userId, reduction , payment_type } = request.body;

        if (!products || products.length === 0) {
            return response.status(400).json({
                success: false,
                message: "Products are required"
            });
        }

        const sellersSet = new Set();
        const enrichedProducts = [];

        // 🔁 Product loop
        for (const item of products) {
            const product = await ProductModel.findById(item.productId);

            if (!product) {
                return response.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            enrichedProducts.push({
                ...item,
                seller: product.seller
            });

            sellersSet.add(product.seller.toString());

            await ProductModel.findByIdAndUpdate(product._id, {
                $inc: {
                    countInStock: -item.quantity,
                    sale: item.quantity
                }
            });
        }
        // 🔥 Generate Order ID
        const orderId = await generateOrderId();
        console.log(3, request.body);
        let isReducable = await reduceWallet(userId, reduction, orderId)
        if (isReducable == "failed") {
            return response.status(409).json({
                success: false,
                message: "reduction amount exceeded wallet amount",
            });
        }
        const order = new OrderModel({
            orderId,
            userId,
            products: enrichedProducts,
            sellers_list: Array.from(sellersSet),
            paymentId: request.body.paymentId,
            payment_status: request.body.payment_status,
            delivery_address: request.body.delivery_address,
            totalAmt: request.body.totalAmt
        });

        const savedOrder = await order.save();
        if(payment_type=="COD"){
            console.log(savedOrder)
                const products = savedOrder.products
                const address = await AddressModel.findOne({ userId: savedOrder.userId });
                try {
                    for (const item of products) {
                        const user = await UserModel.findById(savedOrder.userId);
                        const product = await ProductModel.findById(item.productId);
                        const sub_id = await generateSubOrderId()
                        product.sub_id = sub_id
                        const pickup = await UserModel.findById(product.seller);
                        const shiprocketRes = await createShiprocketOrder({
                            pickup,
                            product: item,
                            order : savedOrder,
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
        }
        // 📧 Send confirmation email
        const user = await UserModel.findById(userId);

        console.log(user);
        await sendEmailFun({
            sendTo: [user.email],
            subject: "Order Confirmation",
            html: OrderConfirmationEmail(user.name, savedOrder)
        });

        return response.status(200).json({
            success: true,
            message: "Order Placed Successfully",
            order: savedOrder
        });

    } catch (error) {
        return response.status(500).json({
            success: false,
            message: error.message || error
        });
    }
};

import mongoose from "mongoose";

export const cancelOrderController = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { product_id, order_id, user_id, reason } = req.body;

        // ✅ Fixed validation message
        if (!product_id || !order_id || !user_id) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "order_id, product_id, and user_id are required"
            });
        }

        // ✅ Authorization check — ensure order belongs to this user
        const order = await OrderModel.findOne({
            _id: order_id,
            userId: user_id,
            "products._id": product_id
        }).session(session);

        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Order not found or does not belong to this user"
            });
        }

        // ✅ Find the specific product using _id (not sub_id)
        const product = order.products.find(
            p => p._id.toString() === product_id.toString()
        );

        if (!product) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Product not found in order"
            });
        }

        // ✅ Guard against cancelling already-cancelled/delivered products
        const NON_CANCELLABLE_STATUSES = ["CANCELLED", "DELIVERED", "RETURNED"];
        if (NON_CANCELLABLE_STATUSES.includes(product.status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Product cannot be cancelled as it is already ${product.status}`
            });
        }

        // ✅ Shipment is at order level (based on your schema)
        if (!order.shipment?.shiprocket_order_id) {
            // Allow cancel without shiprocket if shipment not yet created
            console.warn(`No shiprocket_order_id found for order ${order_id}, skipping shiprocket cancellation`);
        }

        let cancelRes = { success: true, data: null };

        // ✅ Only call Shiprocket if shipment was actually created in shiprocket
        if (order.shipment?.shiprocket_order_id) {
            cancelRes = await cancelShiprocketOrder(order.shipment.shiprocket_order_id);

            if (!cancelRes.success) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: cancelRes.message,
                    error: cancelRes.error
                });
            }
        }

        // ✅ Build cancelled product object from plain object (avoids Mongoose internals)
        const cancelledProduct = {
            ...product.toObject(),
            status: "CANCELLED",
            reason: reason || "No reason provided",
            cancelled_at: new Date(),
            ...(cancelRes.data && { cancel_resp: cancelRes.data })
        };

        // ✅ Atomically pull from products and push to cancelled_products
        await OrderModel.updateOne(
            { _id: order_id },
            {
                $pull: { products: { _id: product._id } },
                $push: { cancelled_products: cancelledProduct },
                // ✅ Update order-level shipment status only if all products are cancelled
                ...(order.products.length === 1 && {
                    "shipment.status": "CANCELLED",
                    order_status: "cancelled"
                })
            },
            { session }
        );

        // ✅ Refund using quantity * price (matches your schema — no paid_amount field)
        const refundAmount = Math.ceil(product.quantity * product.price);
        if(order.payment_status=="paid"){
            await UserModel.updateOne(
                { _id: user_id },
                {
                    $inc: { "wallet.balance": refundAmount },
                    $push: {
                        "wallet.transactions": {
                            amount: refundAmount,
                            type: "CREDIT",
                            reason: "Order Cancel Refund",
                            orderId: product._id,
                            createdAt: new Date()
                        }
                    }
                },
                { session }
            );
        }

        // ✅ Commit both DB operations atomically
        await session.commitTransaction();
        session.endSession();

        console.log(`Order ${order_id} | Product ${product_id} cancelled by user ${user_id}`);

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: {
                refundAmount,
                cancelledProduct,
                ...(cancelRes.data && { shiprocket: cancelRes.data })
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("cancelOrderController error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

export async function getOrderDetailsController(request, response) {
    try {
        const userId = request.userId // order id
        let token_data = await decoder(request)
        let role = token_data?.user.role

        let query = {}
        if (role == "SELLER") {
            query.sellers_list = { $in: [token_data.user._id] }
            //particular 
        }
        console.log(query);

        const { page, limit } = request.query;

        const orderlist = await OrderModel.find(query).sort({ createdAt: -1 }).populate('delivery_address userId').skip((page - 1) * limit).limit(parseInt(limit));

        const total = await OrderModel.countDocuments(orderlist);

        return response.json({
            message: "order list",
            data: orderlist,
            error: false,
            success: true,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function getUserOrderDetailsController(request, response) {
    try {
        const userId = request.userId // order id

        const { page, limit } = request.query;

        const orderlist = await OrderModel.find({ userId: userId }).sort({ createdAt: -1 }).populate('delivery_address userId').skip((page - 1) * limit).limit(parseInt(limit));

        const orderTotal = await OrderModel.find({ userId: userId }).sort({ createdAt: -1 }).populate('delivery_address userId');

        const total = await orderTotal?.length;

        return response.json({
            message: "order list",
            data: orderlist,
            error: false,
            success: true,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


export async function getTotalOrdersCountController(request, response) {
    try {
        const ordersCount = await OrderModel.countDocuments();
        return response.status(200).json({
            error: false,
            success: true,
            count: ordersCount
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



function getPayPalClient() {

    const environment =
        process.env.PAYPAL_MODE === "live"
            ? new paypal.core.LiveEnvironment(
                process.env.PAYPAL_CLIENT_ID_LIVE,
                process.env.PAYPAL_SECRET_LIVE
            )
            : new paypal.core.SandboxEnvironment(
                process.env.PAYPAL_CLIENT_ID_TEST,
                process.env.PAYPAL_SECRET_TEST
            );

    return new paypal.core.PayPalHttpClient(environment);


}


export const createOrderPaypalController = async (request, response) => {
    try {

        const req = new paypal.orders.OrdersCreateRequest();
        req.prefer("return=representation");

        req.requestBody({
            intent: "CAPTURE",
            purchase_units: [{
                amount: {
                    currency_code: 'INR',
                    value: request.query.totalAmount
                }
            }]
        });


        try {
            const client = getPayPalClient();
            const order = await client.execute(req);
            response.json({ id: order.result.id });
        } catch (error) {
            console.error(error);
            response.status(500).send("Error creating PayPal order");
        }

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}




export const captureOrderPaypalController = async (request, response) => {
    try {
        const { paymentId } = request.body;

        const req = new paypal.orders.OrdersCaptureRequest(paymentId);
        req.requestBody({});

        const orderInfo = {
            userId: request.body.userId,
            products: request.body.products,
            paymentId: request.body.paymentId,
            payment_status: request.body.payment_status,
            delivery_address: request.body.delivery_address,
            totalAmt: request.body.totalAmount,
            date: request.body.date
        }

        const order = new OrderModel(orderInfo);
        await order.save();

        const user = await UserModel.findOne({ _id: request.body.userId })

        const recipients = [];
        recipients.push(user?.email);

        // Send verification email
        await sendEmailFun({
            sendTo: recipients,
            subject: "Order Confirmation",
            text: "",
            html: OrderConfirmationEmail(user?.name, order)
        })


        for (let i = 0; i < request.body.products.length; i++) {

            const product = await ProductModel.findOne({ _id: request.body.products[i].productId })

            await ProductModel.findByIdAndUpdate(
                request.body.products[i].productId,
                {
                    countInStock: parseInt(request.body.products[i].countInStock - request.body.products[i].quantity),
                    sale: parseInt(product?.sale + request.body.products[i].quantity)
                },
                { new: true }
            );
        }


        return response.status(200).json(
            {
                success: true,
                error: false,
                order: order,
                message: "Order Placed"
            }
        );

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



export const updateOrderStatusController = async (request, response) => {
    try {
        const { id, order_status } = request.body;

        const updateOrder = await OrderModel.updateOne(
            {
                _id: id,
            },
            {
                order_status: order_status,
            },
            { new: true }
        )

        return response.json({
            message: "Update order status",
            success: true,
            error: false,
            data: updateOrder
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }

}






export const totalSalesController = async (request, response) => {
    try {
        const currentYear = new Date().getFullYear();

        const ordersList = await OrderModel.find();

        let totalSales = 0;
        let monthlySales = [
            {
                name: 'JAN',
                TotalSales: 0
            },
            {
                name: 'FEB',
                TotalSales: 0
            },
            {
                name: 'MAR',
                TotalSales: 0
            },
            {
                name: 'APRIL',
                TotalSales: 0
            },
            {
                name: 'MAY',
                TotalSales: 0
            },
            {
                name: 'JUNE',
                TotalSales: 0
            },
            {
                name: 'JULY',
                TotalSales: 0
            },
            {
                name: 'AUG',
                TotalSales: 0
            },
            {
                name: 'SEP',
                TotalSales: 0
            },
            {
                name: 'OCT',
                TotalSales: 0
            },
            {
                name: 'NOV',
                TotalSales: 0
            },
            {
                name: 'DEC',
                TotalSales: 0
            },
        ]


        for (let i = 0; i < ordersList.length; i++) {
            totalSales = totalSales + parseInt(ordersList[i].totalAmt);
            const str = JSON.stringify(ordersList[i]?.createdAt);
            const year = str.substr(1, 4);
            const monthStr = str.substr(6, 8);
            const month = parseInt(monthStr.substr(0, 2));

            if (currentYear == year) {

                if (month === 1) {
                    monthlySales[0] = {
                        name: 'JAN',
                        TotalSales: monthlySales[0].TotalSales = parseInt(monthlySales[0].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 2) {

                    monthlySales[1] = {
                        name: 'FEB',
                        TotalSales: monthlySales[1].TotalSales = parseInt(monthlySales[1].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 3) {
                    monthlySales[2] = {
                        name: 'MAR',
                        TotalSales: monthlySales[2].TotalSales = parseInt(monthlySales[2].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 4) {
                    monthlySales[3] = {
                        name: 'APRIL',
                        TotalSales: monthlySales[3].TotalSales = parseInt(monthlySales[3].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 5) {
                    monthlySales[4] = {
                        name: 'MAY',
                        TotalSales: monthlySales[4].TotalSales = parseInt(monthlySales[4].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 6) {
                    monthlySales[5] = {
                        name: 'JUNE',
                        TotalSales: monthlySales[5].TotalSales = parseInt(monthlySales[5].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 7) {
                    monthlySales[6] = {
                        name: 'JULY',
                        TotalSales: monthlySales[6].TotalSales = parseInt(monthlySales[6].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 8) {
                    monthlySales[7] = {
                        name: 'AUG',
                        TotalSales: monthlySales[7].TotalSales = parseInt(monthlySales[7].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 9) {
                    monthlySales[8] = {
                        name: 'SEP',
                        TotalSales: monthlySales[8].TotalSales = parseInt(monthlySales[8].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 10) {
                    monthlySales[9] = {
                        name: 'OCT',
                        TotalSales: monthlySales[9].TotalSales = parseInt(monthlySales[9].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 11) {
                    monthlySales[10] = {
                        name: 'NOV',
                        TotalSales: monthlySales[10].TotalSales = parseInt(monthlySales[10].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

                if (month === 12) {
                    monthlySales[11] = {
                        name: 'DEC',
                        TotalSales: monthlySales[11].TotalSales = parseInt(monthlySales[11].TotalSales) + parseInt(ordersList[i].totalAmt)
                    }
                }

            }


        }


        return response.status(200).json({
            totalSales: totalSales,
            monthlySales: monthlySales,
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}





export const totalUsersController = async (request, response) => {
    try {
        let body = request.body
        console.log(body);

        const users = await UserModel.aggregate([
            {
                $match: {
                    role: body.type
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 },
            },
        ]);



        let monthlyUsers = [
            {
                name: 'JAN',
                TotalUsers: 0
            },
            {
                name: 'FEB',
                TotalUsers: 0
            },
            {
                name: 'MAR',
                TotalUsers: 0
            },
            {
                name: 'APRIL',
                TotalUsers: 0
            },
            {
                name: 'MAY',
                TotalUsers: 0
            },
            {
                name: 'JUNE',
                TotalUsers: 0
            },
            {
                name: 'JULY',
                TotalUsers: 0
            },
            {
                name: 'AUG',
                TotalUsers: 0
            },
            {
                name: 'SEP',
                TotalUsers: 0
            },
            {
                name: 'OCT',
                TotalUsers: 0
            },
            {
                name: 'NOV',
                TotalUsers: 0
            },
            {
                name: 'DEC',
                TotalUsers: 0
            },
        ]




        for (let i = 0; i < users.length; i++) {

            if (users[i]?._id?.month === 1) {
                monthlyUsers[0] = {
                    name: 'JAN',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 2) {
                monthlyUsers[1] = {
                    name: 'FEB',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 3) {
                monthlyUsers[2] = {
                    name: 'MAR',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 4) {
                monthlyUsers[3] = {
                    name: 'APRIL',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 5) {
                monthlyUsers[4] = {
                    name: 'MAY',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 6) {
                monthlyUsers[5] = {
                    name: 'JUNE',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 7) {
                monthlyUsers[6] = {
                    name: 'JULY',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 8) {
                monthlyUsers[7] = {
                    name: 'AUG',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 9) {
                monthlyUsers[8] = {
                    name: 'SEP',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 10) {
                monthlyUsers[9] = {
                    name: 'OCT',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 11) {
                monthlyUsers[10] = {
                    name: 'NOV',
                    TotalUsers: users[i].count
                }
            }

            if (users[i]?._id?.month === 12) {
                monthlyUsers[11] = {
                    name: 'DEC',
                    TotalUsers: users[i].count
                }
            }

        }



        return response.status(200).json({
            TotalUsers: monthlyUsers,
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



export async function deleteOrder(request, response) {
    const order = await OrderModel.findById(request.params.id);

    console.log(request.params.id)

    if (!order) {
        return response.status(404).json({
            message: "Order Not found",
            error: true,
            success: false
        })
    }


    const deletedOrder = await OrderModel.findByIdAndDelete(request.params.id);

    if (!deletedOrder) {
        response.status(404).json({
            message: "Order not deleted!",
            success: false,
            error: true
        });
    }

    return response.status(200).json({
        success: true,
        error: false,
        message: "Order Deleted!",
    });
}