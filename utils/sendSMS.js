import axios from 'axios';

export async function sendOtpSms(mobile, otp) {
    let formattedNumber = mobile.toString().replace(/\D/g, '');
    if (formattedNumber.length !== 10) {
        throw new Error('Invalid mobile number format');
    }

    const params = new URLSearchParams({
        key: process.env.PING4SMS_API_KEY,
        route: '2', // '2' = OTP/transactional route on most Ping4sms-family panels — confirm exact route code in your dashboard
        sender: process.env.PING4SMS_SENDER_ID,
        number: "+917012172355",
        sms: `Your OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`,
        templateid: process.env.PING4SMS_DLT_TEMPLATE_ID
    });

    try {
        const response = await axios.get(`https://site.ping4sms.com/api/smsapi?${params.toString()}`, {
            timeout: 8000
        });

        // response is typically plain text or simple JSON depending on account — log first, then branch
        return response.data;
    } catch (error) {
        console.error('PING4SMS error:', error?.response?.data || error.message);
        throw new Error('Failed to send OTP SMS');
    }
}