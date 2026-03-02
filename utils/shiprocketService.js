import axios from "axios";
import CounterModel from "../models/counter.model.js";
import { getShiprocketToken } from "../middlewares/shipmentAuth.js";

export const generateOrderId = async () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const datePrefix = `${year}${month}${day}`;
  const counterId = `order_${datePrefix}`;
  const prefix = `FF${datePrefix}`;

  // 🔥 Atomic increment (THIS IS THE KEY)
  const counter = await CounterModel.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true   // create if not exists
    }
  );

  const paddedNumber = String(counter.seq).padStart(5, "0");

  return `${prefix}${paddedNumber}`;
};

export const generateShiprocketToken = async () => {
  try {
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    // ✅ Success
    if (response.data?.token) {
      return {
        success: true,
        token: response.data.token,
        data: response.data
      };
    }
    console.log("generateShiprocketToken :");
    
    // ❌ Unexpected structure
    return {
      success: false,
      message: "Token not received from Shiprocket"
    };

  } catch (error) {
    
    // ❌ Shiprocket validation error (422 etc)
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || "Shiprocket login failed",
        errors: error.response.data?.errors || null,
        status_code: error.response.status
      };
    }

    // ❌ Network or internal error
    return {
      success: false,
      message: error.message || "Internal error while generating token"
    };
  }
};

export const createShiprocketOrder = async ({ order, address, user }) => {
  try {

    const tokenRes = await getShiprocketToken();

    if (!tokenRes.success) {
      return tokenRes;
    }

    const token = tokenRes.token;

    const orderItems = order.products.map((item, index) => ({
      name: item.productTitle,
      sku: `SKU_${index + 1}`,
      units: item.quantity,
      selling_price: item.price,
      discount: 0,
      tax: 0,
      hsn: 441122
    }));

    const payload = {
      order_id: order.orderId,
      order_date: new Date().toISOString().slice(0, 16).replace("T", " "),
      pickup_location: "SLVD Warehouse",
      comment: "Order from system",

      billing_customer_name: user.name,
      billing_last_name: "",
      billing_address: address.address_line1 + " " + (address.landmark || ""),
      billing_city: address.city.trim(),
      billing_pincode: address.pincode,
      billing_state: address.state.trim(),
      billing_country: address.country,
      billing_email: user.email,
      billing_phone: String(address.mobile),

      shipping_is_billing: true,
      order_items: orderItems,

      payment_method:
        order.payment_status === "paid" ? "Prepaid" : "COD",

      sub_total: order.totalAmt,

      length: 10,
      breadth: 15,
      height: 20,
      weight: 2.5
    };
    console.log("payload : ",payload);
    

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message,
        error: error.response.data
      };
    }

    return {
      success: false,
      message: error.message
    };
  }
};

export const cancelShiprocketOrder = async (shiprocketOrderId) => {
  try {

    // 🔑 Get token
    const tokenRes = await getShiprocketToken();

    if (!tokenRes.success) {
      return {
        success: false,
        message: "Token generation failed",
        error: tokenRes
      };
    }

    const token = tokenRes.token;

    // 🚀 API Call
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/cancel",
      {
        ids: [shiprocketOrderId]  // 👈 IMPORTANT
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    return {
      success: true,
      data: response.data
    };

  } catch (error) {

    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || "Cancel failed",
        error: error.response.data
      };
    }

    return {
      success: false,
      message: error.message
    };
  }
};

export const createPickupLocation = async (pickupData) => {
  try {

    // 🔑 Step 1: Get token
    const tokenRes = await getShiprocketToken();

    if (!tokenRes.success) {
      return {
        success: false,
        message: "Token generation failed",
        error: tokenRes
      };
    }

    const token = tokenRes.token;

    // 📦 Step 2: Prepare payload
    const payload = {
      pickup_location: pickupData.pickup_location, // 👈 UNIQUE NAME
      name: pickupData.name,
      email: pickupData.email,
      phone: pickupData.phone,
      address: pickupData.address,
      address_2:  "",
      city: pickupData.city.trim(),
      state: pickupData.state.trim(),
      country: pickupData.country || "India",
      pin_code: pickupData.pin_code
    };

    // 🚀 Step 3: API call
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/settings/company/addpickup",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    return {
      success: true,
      data: response.data
    };

  } catch (error) {

    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || "Pickup creation failed",
        error: error.response.data
      };
    }

    return {
      success: false,
      message: error.message
    };
  }
};


export const getDeliveryEstimate = async ({
  pickupPincode,
  deliveryPincode,
  weight = "2.5",
  cod = true
}) => {
  try {
    const {token} = await getShiprocketToken();
    console.log("token : ",token);
    
    const payload = {
        pickup_postcode : pickupPincode,
        delivery_postcode: deliveryPincode,
        weight: weight,
        cod: cod
      }
      console.log(payload);

    const response = await axios({
      method: "GET",
      url: "https://apiv2.shiprocket.in/v1/external/courier/serviceability/",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      data: payload
    });

    const couriers =
      response?.data?.data?.available_courier_companies || [];

    if (!couriers.length) {
      return {
        success: false,
        message: "No courier available"
      };
    }

    // ✅ Sort by fastest delivery
    couriers.sort(
      (a, b) => a.estimated_delivery_days - b.estimated_delivery_days
    );

    const bestCourier = couriers[0];

    // 📅 Calculate estimated delivery date
    const today = new Date();
    const estimatedDays = bestCourier.estimated_delivery_days || 0;

    const deliveryDate = new Date();
    deliveryDate.setDate(today.getDate() + estimatedDays);

    return {
      success: true,
      courier_name: bestCourier.courier_name,
      estimated_days: estimatedDays,
      estimated_delivery_date: deliveryDate.toISOString().split("T")[0],
      freight_charge: bestCourier.freight_charge,
      cod_charges: bestCourier.cod_charges
    };

  } catch (error) {
    console.error(
      "Serviceability Error:",
      error?.response?.data || error.message
    );

    return {
      success: false,
      message:
        error?.response?.data?.message || "Shiprocket API failed"
    };
  }
};