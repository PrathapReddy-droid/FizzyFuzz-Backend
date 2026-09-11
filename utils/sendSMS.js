import axios from "axios";

export async function sendOtpSms(mobile, otp) {
    const formattedNumber = String(mobile).replace(/\D/g, "");

    if (formattedNumber.length !== 10) {
        throw new Error("Invalid mobile number format");
    }

    const smsMessage =
        `Your OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`;

    const params = new URLSearchParams({
    key: process.env.PING4SMS_API_KEY,
    route: process.env.PING4SMS_ROUTE,
    sender: process.env.PING4SMS_SENDER_ID,
    number: formattedNumber,
    sms: `Dear Customer, ${otp} is your verification code -PNGOTP`,
    templateid: process.env.PING4SMS_DLT_TEMPLATE_ID,
});

    try {
        const url =
            `${process.env.PING4SMS_BASE_URL}?${params.toString()}`;

        console.log(url);
        
        const response = await axios.get(url, {
            timeout: 8000,
        });

        console.log("PING4SMS STATUS:", response.status);
        console.log("PING4SMS RESPONSE:", response.data);

        return response.data;

    } catch (error) {
        console.error("PING4SMS ERROR:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });

        throw new Error("Failed to send OTP SMS");
    }
}