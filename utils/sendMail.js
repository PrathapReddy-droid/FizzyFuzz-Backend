import { SendMailClient } from "zeptomail"

const url = "https://api.zeptomail.in/v1.1/email";
const token = "<SEND_MAIL_TOKEN>";

let client = new SendMailClient({url, token});

client.sendMail({
    "from": 
    {
        "address": "fizzyfuzz",
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
    "htmlbody": "<div><b> Test email sent successfully.</b></div>",
}).then((resp) => console.log("success")).catch((error) => console.log("error"));