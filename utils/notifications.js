// notification.js
import UserModel from "../models/user.model.js";
import admin from "./firebase";

export const sendNotification = async (userId, status, orderId) => {
  try {
    const user = await UserModel.findById(userId);

    if (!user?.fcmToken) return;

    let title = "Order Update";
    let body = "";

    switch (status) {
      case "CONFIRMED":
        body = `Your order ${orderId} is confirmed`;
        break;
      case "SHIPPED":
        body = `Your order ${orderId} has been shipped`;
        break;
      case "IN_TRANSIT":
        body = `Your order ${orderId} is on the way 🚚`;
        break;
      case "DELIVERED":
        body = `Your order ${orderId} has been delivered 🎉`;
        break;
      case "CANCELLED":
        body = `Your order ${orderId} was cancelled`;
        break;
      case "registered":
        body = `User registered to fizzy fuzz successfully`;
        break;
      default:
        body = `Order ${orderId} updated`;
    }

    const message = {
      token: user.fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        orderId: orderId,
        status: status,
      },
    };

    const response = await admin.messaging().send(message);

    console.log("✅ Notification sent:", response);
    return
  } catch (err) {
    console.error("❌ FCM error:", err.message);
    if (err.code === 'messaging/registration-token-not-registered') {
      await User.updateOne({ _id: userId }, { $unset: { fcmToken: "" } });
    }
    return
  }
};