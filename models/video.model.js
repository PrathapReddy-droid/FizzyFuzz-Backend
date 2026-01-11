import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      trim: true
    },
    video_url: {
      type: String,
      required: true
    },
    user_id : {
      type: String,
      required: true
    },
    s3_key: {
      type: String,
      required: true
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    live_link : {
      type: String ,
      required: true
    },
    is_active: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("videos", videoSchema);