import mongoose from "mongoose";

const pricingRuleSchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true,
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    commissionPercent: {
        type: Number,
        required: true,
        default: 10
    },
    paymentGatewayPercent: {
        type: Number,
        required: true,
        default: 2
    },
    gstPercent: {
        type: Number,
        required: true,
        default: 18
    },
    shippingFee: {
        type: Number,
        required: true,
        default: 40
    }
}, { timestamps: true });

export const PricingRuleModel = mongoose.model("pricings", pricingRuleSchema);
export default PricingRuleModel;