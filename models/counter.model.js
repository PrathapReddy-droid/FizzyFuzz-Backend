import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String },   // e.g. "order_20260302"
  seq: { type: Number, default: 0 }
});

const CounterModel = mongoose.model("counter", counterSchema);

export default CounterModel;