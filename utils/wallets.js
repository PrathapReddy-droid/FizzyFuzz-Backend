import UserModel from "../models/user.model.js";

const reduceWallet = async (userId, payAmount, sub_id) => {
  try {
    const result = await UserModel.updateOne(
      {
        _id: userId,
        "wallet.balance": { $gte: payAmount } // ensures enough balance
      },
      {
        $inc: { "wallet.balance": -payAmount },
        $push: {
          "wallet.transactions": {
            amount: payAmount,
            type: "DEBIT",
            reason: "Order Payment",
            orderId: sub_id,
            createdAt: new Date()
          }
        }
      }
    );

    if (result.modifiedCount === 0) {
      return "failed"; // insufficient balance or user not found
    }

    return "success";
  } catch (error) {
    console.error("Wallet debit error:", error);
    return "failed";
  }
};

export { reduceWallet };