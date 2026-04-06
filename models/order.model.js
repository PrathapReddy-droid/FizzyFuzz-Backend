import mongoose from "mongoose";
import { sendNotification } from "../utils/notifications";

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
            sub_id : { type : String, default : "" },
            subTotal: Number,
            seller: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            status:{
                type: String,
                enum: ['PENDING', "CONFIRMED","IN-TRANSIT" ,"DELIVERED","CANCELLED"],
                default: "PENDING"
            },
            shipment: {
                shiprocket_order_id: String,
                shipment_id: String,
                status: String,
                raw_response: Object
            }
        }
    ],
    
    cancelled_products : { type : Array, default: [] },
    paymentId: { type: String, default: "" },
    orderId:{type:String, default:""},
    payment_status : { type : String, default : "" },
    order_status : { type : String, default : "confirm" },
    delivery_address: {
        type: Object,
        ref: 'address'
    },
    totalAmt: { type: Number, default: 0 },
    reduction: { type: Number, default: 0 },
    full_wallet : { type: Boolean , default: false },

}, { timestamps: true });

orderSchema.pre('findOneAndUpdate', async function (next) {
    // Get the document BEFORE update
    this._oldDoc = await this.model.findOne(this.getQuery());
    next();
});

orderSchema.post('findOneAndUpdate', async function (doc) {
    if (!doc) return;

    const oldStatus = this._oldDoc?.shipment?.status;
    const newStatus = doc?.shipment?.status;

    if (oldStatus !== newStatus) {
        console.log(`Status changed from ${oldStatus} → ${newStatus}`);

        await sendNotification(doc.userId, newStatus, doc.orderId);
    }
});

orderSchema.pre('save', function (next) {
    // Track if document is new
    this._wasNew = this.isNew;
    next();
});

orderSchema.post('save', function (doc) {
    if (!doc) return;

    const isStatusModified = this.isModified('shipment.status');
    const newStatus = doc?.shipment?.status;

    // Case 1: New order created
    if (this._wasNew) {
        console.log(`New order created with status: ${newStatus}`);

        setImmediate(() => {
            sendNotification(doc.userId, newStatus, doc.orderId);
        });
        return;
    }

    // Case 2: Existing order status updated
    if (isStatusModified) {
        console.log(`Shipment status updated to: ${newStatus}`);

        setImmediate(() => {
            sendNotification(doc.userId, newStatus, doc.orderId);
        });
    }
});

const OrderModel = mongoose.model('orders', orderSchema)

export default OrderModel