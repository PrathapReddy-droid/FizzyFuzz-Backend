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

  export const generateSubOrderId = async () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const datePrefix = `${year}${month}${day}`;
    const counterId = `order_${datePrefix}`;
    const prefix = `SUBORD${datePrefix}`;

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

  export const createShiprocketOrder = async ({ order, address, user,pickup ,product}) => {
    try {

      const tokenRes = await getShiprocketToken();

      if (!tokenRes.success) {
        return tokenRes;
      }

      const token = tokenRes.token;
      console.log("productproductproductproductproduct : ",product);
      
      const orderItems = [{
        name: product.productTitle,
        sku: `SKU_${1}`,
        units: product.quantity,
        selling_price: product.price,
        discount: 0,
        tax: 0,
        hsn: 441122
      }    ]
      const payload = {
        order_id: product.sub_id,
        order_date: new Date().toISOString().slice(0, 16).replace("T", " "),
        pickup_location: pickup.pickup_location,
        comment: "Order from system",

        billing_customer_name: user.name,
        billing_last_name: "",
        billing_address: address.address_line1 + " " + (address.landmark || ""),
        billing_city: address.city.trim(),
        billing_pincode: address.pincode,
        billing_state: address.state.trim(),
        billing_country: address.country,
        billing_email: user.email,
        billing_phone: address.mobile,

        shipping_is_billing: true,
        order_items: orderItems,

        payment_method : order.payment_status === "paid" ? "Prepaid" : "COD",

        sub_total: Math.ceil(product.quantity*product.price),

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

  export const trackShiprocketOrder = async (shipmentId) => {
    try {
      const tokenRes = await getShiprocketToken();

      if (!tokenRes.success) {
        return {
          success: false,
          message: "Token generation failed",
          error: tokenRes
        };
      }

      const token = tokenRes.token;

      const response = await axios.get(
        `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`,
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
          message: error.response.data?.message || "Tracking failed",
          error: error.response.data
        };
      }

      return {
        success: false,
        message: error.message
      };
    }
  };

export const createShiprocketReturnOrder = async ({ order, product, user, address, pickup }) => {
  try {
    const tokenRes = await getShiprocketToken();
    if (!tokenRes.success) return tokenRes;

    const token = tokenRes.token;

    const payload = {
      order_id: `RET_${product.sub_id}_${Date.now()}`,
      order_date: new Date().toISOString().split("T")[0],
      channel_id: process.env.SHIPROCKET_CHANNEL_ID,

      // Pickup = customer (returning the item)
      pickup_customer_name: user.name,
      pickup_last_name: "",
      company_name: "",
      pickup_address: address.address_line1 + " " + (address.landmark || ""),
      pickup_address_2: "",
      pickup_city: address.city.trim(),
      pickup_state: address.state.trim(),
      pickup_country: address.country || "India",
      pickup_pincode: address.pincode,
      pickup_email: user.email,
      pickup_phone: address.mobile,
      pickup_isd_code: "91",

      // Shipping = seller (receiving the return)
      shipping_customer_name: pickup.name,
      shipping_last_name: "",
      shipping_address: pickup.address || "",
      shipping_address_2: "",
      shipping_city: pickup.city?.trim() || "",
      shipping_state: pickup.state?.trim() || "",
      shipping_country: pickup.country || "India",
      shipping_pincode: pickup.pin_number,
      shipping_email: pickup.email,
      shipping_phone: pickup.mobile || pickup.phone,
      shipping_isd_code: "91",

      order_items: [
        {
          name: product.productTitle,
          sku: `SKU_${product.productId}`,
          units: product.quantity,
          selling_price: product.price,
          discount: 0,
          hsn: 441122
        }
      ],

      payment_method: "PREPAID",
      total_discount: "0",
      sub_total: Math.ceil(product.quantity * product.price),

      length: 10,
      breadth: 15,
      height: 20,
      weight: 2.5
    };

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/return",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    return { success: true, data: response.data };

  } catch (error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message,
        error: error.response.data
      };
    }
    return { success: false, message: error.message };
  }
};