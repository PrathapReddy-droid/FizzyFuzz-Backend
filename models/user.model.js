import mongoose from "mongoose";
import { sendNotification } from "../utils/notifications";

const userSchema = mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, "Provide name"]
    },
    email: {
        type: String,
        required: [true, "Provide email"],
        unique: true
    },
    mobile: {
        type: String,
        required: [true, "Provide mobile"],
        unique: true
    },
    fcm_token : { type: String } ,
    gst: {
        type: String,
        default: "",
    },
    bank_account: {
        type: String,
        default: "",
    },
    ifsc: {
        type: String,
        default: "",
    },
    business: {
        type: String,
        default: ""
    },
    password: {
        type: String,
        required: [true, "Provide password"]
    },
    avatar: {
        type: String,
        default: ""
    },
    kyc_img : {
        type: String,
        default: ""
    },
    kyc_number : {
        type: String,
        default: ""
    },
    kyc_type : {
        type: String,
        default: ""
    },
    mobile: {
        type: Number,
        default: null
    },
    verify_email: {
        type: Boolean,
        default: false
    },
    access_token: {
        type: String,
        default: ''
    },
    refresh_token: {
        type: String,
        default: ''
    },
    last_login_date: {
        type: Date,
        default: ""
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Suspended"],
        default: "Active"
    },
    address_details: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'address'
        }
    ],
    address: {
        type: String,
        default: ""
    },
    orderHistory: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'order'
        }
    ],
    otp:{
        type:String
    },
    otpExpires:{
        type:Date
    },
    role: {
        type: String,
        enum: ['ADMIN', "USER" ,"SELLER"],
        default: "USER"
    },
    pin_number : {
        type: String
    },
    aadhaar_number : {
        type: String
    },
    pan_number : {
        type: String
    },
    signUpWithGoogle:{
        type:Boolean,
        default:false
    },
    isLiveEnabled:{
        type:Boolean,
        default:false
    },
    city:{
        type:String,
        default:""
    },
    state:{
        type:String,
        default:""
    },
    pickup_location:{
        type:String,
        default:""
    },
    isConfirmed:{
        type:Boolean,
        default:false
    },
    wallet: {
        balance: {
            type: Number,
            default: 0
        },
        transactions: [
            {
                amount: {
                    type: Number,
                    required: true
                },
                type: {
                    type: String,
                    enum: ["CREDIT", "DEBIT"],
                    required: true
                },
                reason: {
                    type: String,
                    default: ""
                },
                orderId: {
                    type: String,
                    ref: "order"
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
},
    { timestamps: true }
)


userSchema.pre('findOneAndUpdate', async function (next) {
    // Get the document BEFORE update
    this._oldDoc = await this.model.findOne(this.getQuery());
    next();
});

userSchema.post('findOneAndUpdate', async function (doc) {
    if (!doc) return;

    const oldStatus = this._oldDoc?.verify_email;
    const newStatus = doc?.verify_email;

    if (oldStatus === false && newStatus === true ) {
        console.log(`Status changed from ${oldStatus} → ${newStatus}`);
        await sendNotification(doc.userId, "registered");
    }
});


userSchema.pre('save', async function (next) {
    // Get the document BEFORE update
    this._oldDoc = await this.model.findOne(this.getQuery());
    next();
});

userSchema.post('save', async function (doc) {
    if (!doc) return;

    const oldStatus = this._oldDoc?.verify_email;
    const newStatus = doc?.verify_email;

    if (oldStatus !== newStatus) {
        console.log(`Status changed from ${oldStatus} → ${newStatus}`);

        await sendNotification(doc.userId, "registered");
    }
});
const UserModel = mongoose.model("User",userSchema);

export default UserModel