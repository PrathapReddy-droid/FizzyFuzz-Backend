import { SendMailClient } from "zeptomail";
import dotenv from "dotenv";

dotenv.config();

const url = "https://api.zeptomail.in/v1.1/email";
const token = process.env.ZOHOTOKEN; // ✅ move token to env (IMPORTANT)

const client = new SendMailClient({ url, token });

/**
 * Generic email sender (Reusable)
 */
export async function sendEmail({ to, name, subject, html }) {
  try {
    const response = await client.sendMail({
      from: {
        address: "noreply@fizzyfuzz.in",
        name: "FizzyFuzz"
      },
      to: [
        {
          email_address: {
            address: to,
            name: name
          }
        }
      ],
      subject: subject,
      htmlbody: html
    });

    return { success: true, data: response };

  } catch (error) {
    console.error("ZeptoMail Error:", error);
    return { success: false, error: error.message };
  }
}