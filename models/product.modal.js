import mongoose from 'mongoose';

// Sub-schema for each variant price combination row
const variantPriceSchema = new mongoose.Schema({
    combination: {
        type: Map,
        of: String,   // e.g. { color: "Red", ram: "8GB" }
        required: true,
    },
    price: {
        type: Number,
        default: 0,
    },
    oldPrice: {
        type: Number,
        default: 0,
    },
    discount: {
        type: Number,
        default: 0,
    },
    countInStock: {
        type: Number,
        default: 0,
    },
}, { _id: false });   // no need for a separate _id on each row


const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    images: [
        {
            type: String,
            required: true
        }
    ],
    brand: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        default: 0
    },
    oldPrice: {
        type: Number,
        default: 0
    },
    catName: {
        type: String,
        default: ''
    },
    catId: {
        type: String,
        default: ''
    },
    subCatId: {
        type: String,
        default: ''
    },
    subCat: {
        type: String,
        default: ''
    },
    thirdsubCat: {
        type: String,
        default: ''
    },
    thirdsubCatId: {
        type: String,
        default: ''
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    variants: {
        color: {
            type: [String],
            default: []
        },
        ram: {
            type: [String],
            default: []
        },
        weight: {
            type: [String],
            default: []
        },
        size: {
            type: [String],
            default: []
        },
        length: {
            type: [String],
            default: []
        },
        width: {                 // ← was missing in your original schema
            type: [String],
            default: []
        },
    },

    // ── NEW: per-variant-combination pricing ──────────────────────────────
    variantPrices: {
        type: [variantPriceSchema],
        default: [],
    },
    // ─────────────────────────────────────────────────────────────────────

    countInStock: {
        type: Number,
        required: true,
    },
    rating: {
        type: Number,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        default: "PENDING",
    },
    seller_name: {
        type: String,
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    discount: {
        type: Number,
        required: true,
    },
    sale: {
        type: Number,
        default: 0
    },
    productRam: [
        {
            type: String,
            default: null,
        }
    ],
    size: [
        {
            type: String,
            default: null,
        }
    ],
    productWeight: [
        {
            type: String,
            default: null,
        }
    ],
    bannerimages: [
        {
            type: String,
            required: true
        }
    ],
    fssaiimages: [
        {
            type: String,
            // required: true
        }
    ],
    bannerTitleName: {
        type: String,
        default: '',
    },
    video_url: {
        type: String,
        default: '',
    },
    shipment_days: {
        type: Number,
        required: true
    },
    product_pincode: {
        type: String,
        required: true
    },
    pickup_location: {
        type: String,
        required: true
    },
    returnDays: {
        type: String
    },
    isReturnable : {
        type: String,
        required: true
    },
    fssaiLicenseNumber: {
        type: String,
        required: false
    },
    fssaiCompliant: {
        type: String,
        required: false
    },
    isDisplayOnHomeBanner: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true
});


const ProductModel = mongoose.model('Product', productSchema)

export default ProductModel
