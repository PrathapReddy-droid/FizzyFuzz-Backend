import mongoose from "mongoose";

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
    isConfirmed:{
        type:Boolean,
        default:false
    },
},
    { timestamps: true }
)


const UserModel = mongoose.model("User",userSchema);

export default UserModel