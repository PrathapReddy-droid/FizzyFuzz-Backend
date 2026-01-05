import { SendMailClient } from "zeptomail"

const url = "https://api.zeptomail.in/v1.1/email";
const token = "Zoho-enczapikey PHtE6r0NE+nrj2ct9xEH46DpEcPxMoom++k1L1ZPsocQXqRQSk1co995lzXi+EsiBqFKEqLInY08ueudsr/RczzsZG1IW2qyqK3sx/VYSPOZsbq6x00ft1gac0PeXY7tetFt3SXTvtbYNA==";

let client = new SendMailClient({url, token});

export const sendMail=()=>{
    client.sendMail({
        "from": 
        {
            "address": "admin@fizzyfuzz.in",
            "name": "noreply"
        },
        "to": 
        [
            {
            "email_address": 
                {
                    "address": "saadsulmi@gmail.com",
                    "name": "saad sulmi"
                }
            }
        ],
        "subject": "Test Email",
        "htmlbody": `<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px;">
                <tr>
                <td align="center">

                    <!-- Card -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:#ffffff; border-radius:10px; padding:24px; max-width:420px; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding-bottom:12px;">
                        <h2 style="margin:0; color:#111827;">Verify Your Email</h2>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td align="center" style="font-size:14px; color:#4b5563; line-height:20px;">
                        <p style="margin:0;">
                            Please use the verification code below to confirm your email address.
                        </p>
                        </td>
                    </tr>

                    <!-- Verification Code -->
                    <tr>
                        <td align="center" style="padding:22px 0;">
                        <div style="
                            background:#f3f4f6;
                            display:inline-block;
                            padding:14px 32px;
                            font-size:28px;
                            letter-spacing:8px;
                            font-weight:600;
                            color:#111827;
                            border-radius:8px;
                        ">
                            ${CODE}
                        </div>
                        </td>
                    </tr>

                    <!-- Info -->
                    <tr>
                        <td align="center" style="font-size:13px; color:#6b7280;">
                        <p style="margin:0;">
                            This verification code is valid for <b>10 minutes</b>.
                        </p>
                        <p style="margin-top:6px;">
                            If you didn’t request this, you can safely ignore this email.
                        </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top:18px; font-size:12px; color:#9ca3af;">
                        <p style="margin:0;">
                            © 2026 FizzyFuzz. All rights reserved.
                        </p>
                        </td>
                    </tr>

                    </table>

                </td>
                </tr>
            </table>
            </body>`,
    }).then((resp) => console.log("success")).catch((error) => console.log("error",error.error.details));
}

sendMail()