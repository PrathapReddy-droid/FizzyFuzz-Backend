import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        required: true
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    sellers_list: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    shipment: {
        shiprocket_order_id: { type: String },
        shipment_id: { type: String },
        awb_code: { type: String },

        status: {
            type: String,
            enum: [
                "CREATED",
                "CONFIRMED",
                "PICKED",
                "SHIPPED",
                "IN_TRANSIT",
                "DELIVERED",
                "CANCELLED"
            ],
            default: "CREATED"
        },

        courier_name: { type: String },
        tracking_url: { type: String },

        raw_response: { type: Object } // store full response (very useful 🔥)
    },
    products: [
        {
            productId: String,
            productTitle: String,
            quantity: Number,
            price: Number,
            image: String,
            subTotal: Number,
            seller: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            status:{
                type: String,
                enum: ['PENDING', "CONFIRMED","IN-TRANSIT" ,"DELIVERED"],
                default: "PENDING"
            }
        }
    ],
    paymentId: { type: String, default: "" },
    orderId:{type:String, default:""},
    payment_status : { type : String, default : "" },
    order_status : { type : String, default : "confirm" },
    delivery_address: {
        type: Object,
        ref: 'address'
    },
    totalAmt: { type: Number, default: 0 }

}, { timestamps: true });


const OrderModel = mongoose.model('orders', orderSchema)

export default OrderModel