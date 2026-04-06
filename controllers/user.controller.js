import UserModel from '../models/user.model.js'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sendEmailFun from '../config/sendEmail.js';
import VerificationEmail from '../utils/verifyEmailTemplate.js';
import generatedAccessToken from '../utils/generatedAccessToken.js';
import genertedRefreshToken from '../utils/generatedRefreshToken.js';

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import ReviewModel from '../models/reviews.model.js.js';
import  {sendEmail} from '../utils/sendMail.js';
import decoder from '../middlewares/decoder.js';
import { s3 } from '../utils/awsConfig.js';
import { createPickupLocation } from '../utils/shiprocketService.js';

cloudinary.config({
    cloud_name: process.env.cloudinary_Config_Cloud_Name,
    api_key: process.env.cloudinary_Config_api_key,
    api_secret: process.env.cloudinary_Config_api_secret,
    secure: true,
});


export const generateUniqueFFId = async (UserModel) => {
  let uid;
  let exists = true;

  while (exists) {
    uid = "FF" + Math.floor(10000000 + Math.random() * 90000000);
    exists = await UserModel.findOne({ uid });
  }

  return uid;
};

export async function registerUserController(request, response) {
    try {
        let user;

        const { name, email, password , mobile } = request.body;
        if ( !name || !email || !password || !mobile ) {
            return response.status(400).json({
                message: "provide email, name, password and mobile",
                error: true,
                success: false
            })
        }

        user = await UserModel.findOne({ email: email , isConfirmed : true });

        if (user) {
            return response.json({
                message: "User already Registered with this email",
                error: true,
                success: false
            })
        }

        user = await UserModel.findOne({ email: email , isConfirmed : false });

        if (user) {
            await sendEmail(user.otp,user.email,user.name)
            const user_token = jwt.sign(
                    { email: user.email, id: user._id },
                    process.env.JSON_WEB_TOKEN_SECRET_KEY
                );
            return response.json({
                success: true,
                error: false,
                message: "User already registered successfully!",
                token: user_token, // Optional: include this if needed for verification
            })
        }

        // const verifyCode = "123456";
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        await sendEmail(verifyCode,email,name)


        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(password, salt);
        let userObject = {
            uid : await generateUniqueFFId(UserModel),
            email: email,
            password: hashPassword,
            name: name,
            otp: verifyCode,
            otpExpires: Date.now() + 600000,
            isConfirmed: false
        }
        if(mobile) userObject.mobile = mobile 
        user = new UserModel(userObject);

        await user.save();

        // Send verification email
        await sendEmailFun({
            sendTo: email,
            subject: "Verify email from Ecommerce App",
            text: "",
            html: VerificationEmail(name, verifyCode)
        })


        // Create a JWT token for verification purposes
        const token = jwt.sign(
            { email: user.email, id: user._id },
            process.env.JSON_WEB_TOKEN_SECRET_KEY
        );


        return response.status(200).json({
            success: true,
            error: false,
            message: "User registered successfully! ",
            token: token, // Optional: include this if needed for verification
        });



    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function registerSellerController(request, response) {
    try {
        let user;

        const { name, email, password , mobile } = request.body;
        if (!name || !email || !password || !mobile ) {
            return response.status(400).json({
                message: "provide email, name, password",
                error: true,
                success: false
            })
        }

        user = await UserModel.findOne({ email: email });
        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(password, salt);
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        let expire = Date.now() + 600000

        if (user?.isConfirmed===true) {
            return response.json({
                message: "User already Registered with this email",
                error: true,
                success: false
            })
        }
        else if (user?.isConfirmed===false) {
            sendEmail(verifyCode,user.email,user.name).then(async res=>{
                await UserModel.findByIdAndUpdate(user._id,{$set:{otpExpires:expire,otp:verifyCode,password:hashPassword}})
                const user_token = jwt.sign(
                        { email: user.email, id: user._id },
                        process.env.JSON_WEB_TOKEN_SECRET_KEY
                    );

                return response.json({
                    success: true,
                    error: false,
                    message: "user re-registered successfully!",
                    token: user_token, // Optional: include this if needed for verification
                })
            }).catch(err=>{
                console.log(err);
                
                return response.json({
                    success: false,
                    error: true,
                    message: "OTP Generation Failed",
                })
            })
        }else{
            // const verifyCode = "123456";

            
            let userObject = {
                uid : await generateUniqueFFId(UserModel),
                email: email,
                password: hashPassword,
                name: name,
                otp: verifyCode,
                otpExpires: expire,
                isConfirmed: false,
                role : "SELLER",
                gst : "",
                business : ""
            }
            if(mobile) userObject.mobile = mobile 
            user = new UserModel(userObject);

            await user.save();
            sendEmail(verifyCode,user.email,user.name).then(async res=>{
                const token = jwt.sign(
                    { email: user.email, id: user._id },
                    process.env.JSON_WEB_TOKEN_SECRET_KEY
                );

                return response.status(200).json({
                    success: true,
                    error: false,
                    message: "User registered successfully! ",
                    token: token, // Optional: include this if needed for verification
                });

            }).catch(err=>{
                console.log(err);
                return response.json({
                    success: false,
                    error: true,
                    message: "OTP Generation Failed",
                })
            })
        }
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function verifyEmailController(request, response) {
    try {
        const { email, otp } = request.body;
        
        const user = await UserModel.findOne({ email: email });
        if (!user) {
            return response.status(400).json({ error: true, success: false, message: "OTP expired" });
        }

        const isCodeValid = user.otp === otp;
        const isNotExpired = user.otpExpires > Date.now();

        if (isCodeValid && isNotExpired) {
            user.verify_email = true;
            user.otp = null;
            user.otpExpires = null;
            user.isConfirmed = true
            await user.save();
            return response.status(200).json({ error: false, success: true, message: "Email verified successfully" });
        } else if (!isCodeValid) {
            return response.status(400).json({ error: true, success: false, message: "Invalid OTP" });
        } else {
            return response.status(400).json({ error: true, success: false, message: "OTP expired" });
        }

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


export async function authWithGoogle(request, response) {
    const { name, email, password, avatar, mobile, role } = request.body;

    try {
        const existingUser = await UserModel.findOne({ email: email });

        if (!existingUser) {
            const user = await UserModel.create({
                name: name,
                mobile: mobile,
                email: email,
                password: "null",
                avatar: avatar,
                role: role,
                verify_email: true,
                signUpWithGoogle: true
            });

            await user.save();

            const accesstoken = await generatedAccessToken(user._id);
            const refreshToken = await genertedRefreshToken(user._id);

            await UserModel.findByIdAndUpdate(user?._id, {
                last_login_date: new Date()
            })


            const cookiesOption = {
                httpOnly: true,
                secure: true,
                sameSite: "None"
            }
            response.cookie('accessToken', accesstoken, cookiesOption)
            response.cookie('refreshToken', refreshToken, cookiesOption)


            return response.json({
                message: "Login successfully",
                error: false,
                success: true,
                data: {
                    accesstoken,
                    refreshToken
                }
            })

        } else {
            const accesstoken = await generatedAccessToken(existingUser._id);
            const refreshToken = await genertedRefreshToken(existingUser._id);

            await UserModel.findByIdAndUpdate(existingUser?._id, {
                last_login_date: new Date()
            })


            const cookiesOption = {
                httpOnly: true,
                secure: true,
                sameSite: "None"
            }
            response.cookie('accessToken', accesstoken, cookiesOption)
            response.cookie('refreshToken', refreshToken, cookiesOption)


            return response.json({
                message: "Login successfully",
                error: false,
                success: true,
                data: {
                    accesstoken,
                    refreshToken
                }
            })
        }

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }


}


export async function loginUserController(request, response) {
    try {
        let { email, password , role } = request.body;
        console.log(role);
        
        const user = await UserModel.findOne({ email: email });
        if(!role) role = "USER"
        console.log(user);
        
        if (!user) {
            return response.status(400).json({
                message: "User not register",
                error: true,
                success: false
            })
        }

        if (user.status !== "Active") {
            return response.status(400).json({
                message: "Contact to admin",
                error: true,
                success: false
            })
        }
        if (user.role.toUpperCase()!==role){
            return response.status(400).json({
                message: "user is authorised to login",
                error: true,
                success: false
            })
        }
        if (user.verify_email !== true) {
            return response.status(400).json({
                message: "Your Email is not verify yet please verify your email first",
                error: true,
                success: false
            })
        }

        const checkPassword = await bcryptjs.compare(password, user.password);

        if (!checkPassword) {
            return response.status(400).json({
                message: "Check your password",
                error: true,
                success: false
            })
        }


        const accesstoken = await generatedAccessToken(user);
        const refreshToken = await genertedRefreshToken(user);

        const updateUser = await UserModel.findByIdAndUpdate(user?._id, {
            last_login_date: new Date()
        })


        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }
        response.cookie('accessToken', accesstoken, cookiesOption)
        response.cookie('refreshToken', refreshToken, cookiesOption)

        // let userData = {
        //     isLiveButtonEnabled : userData.isLiveEnabled,

        // }
        return response.json({
            message: "Login successfully",
            error: false,
            success: true,
            data: {
                accesstoken,
                refreshToken,
                
            }
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



//logout controller
export async function logoutController(request, response) {
    try {
        let token = await decoder(null,request.query.token)
        console.log(token);
        let userid = token.id

        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }

        response.clearCookie("accessToken", cookiesOption)
        response.clearCookie("refreshToken", cookiesOption)

        const removeRefreshToken = await UserModel.findByIdAndUpdate(userid, {
            refresh_token: ""
        })

        return response.json({
            message: "Logout successfully",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//image upload
var imagesArr = [];
export async function userAvatarController(req, res) {
  try {
    const userId = req.userId;
    const files = req.files;

    if (!files || !files.length) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const file = files[0];

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files allowed",
      });
    }

    /* ---------------- Upload to S3 ---------------- */
    const s3Key = `user-avatar/${userId}-${Date.now()}-${file.originalname}`;

    await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }).promise();

    const avatarUrl = `https://d30jo9u7kdxiae.cloudfront.net/${s3Key}`;

    /* ------------ Replace avatar in DB ------------ */
    user.avatar = avatarUrl; // old avatar auto-removed from DB
    await user.save();

    return res.status(200).json({
      success: true,
      _id: userId,
      avatar: avatarUrl,
    });

  } catch (error) {
    console.error("Avatar Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || error,
    });
  }
}



export async function userKYCController(req, res) {
  try {
    const userId = req.userId;
    const files = req.files;
    const { kycType } = req.body;

    if (!files || !files.length) {
      return res.status(400).json({
        success: false,
        message: "No KYC document uploaded",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "User not found",
      });
    }

    const file = files[0];

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    /* -----------------------------------------
       Upload KYC image to S3
    ------------------------------------------ */
    const s3Key = `kyc-documents/${userId}-${Date.now()}-${file.originalname}`;

    await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,        // ✅ memoryStorage buffer
      ContentType: file.mimetype,
    }).promise();

    const kycUrl = `https://d30jo9u7kdxiae.cloudfront.net/${s3Key}`;

    /* -----------------------------------------
       Save to DB (replace old one)
    ------------------------------------------ */
    user.kyc_img = kycUrl;
    user.kyc_type = kycType;
    await user.save();

    return res.status(200).json({
      success: true,
      error: false,
      kycDocument: kycUrl,
    });

  } catch (error) {
    console.error("KYC Upload Error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || error,
    });
  }
}


export async function removeImageFromCloudinary(request, response) {
    const imgUrl = request.query.img;

    const urlArr = imgUrl.split("/");
    const image = urlArr[urlArr.length - 1];

    const imageName = image.split(".")[0];

    if (imageName) {
        const res = await cloudinary.uploader.destroy(
            imageName,
            (error, result) => {
                // console.log(error, res)
            }
        );

        if (res) {
            response.status(200).send(res);
        }
    }

}

//update user details
export async function updateUserDetails(request, response) {
    try {
        const userId = request.userId 
        let req = request.body
        const { 
            
            name, 
            email, 
            mobile, 
            password , 
            role,
            panNumber,
            pinCode ,
            aadhaarNumber , 
            gst , 
            business, 
            ifsc, 
            bankAccount , 
            address,
            city,
            state,
            country,
            pickup_location
        } = request.body;

        const userExist = await UserModel.findById(userId);
        if (!userExist)
            return response.status(400).send('The user cannot be Updated!');

        let updater = {
                name: name,
                mobile: mobile,
                email: email,
            }
        if(req?.gst) updater.gst = gst
        if(req?.business) updater.business = business
        if(req?.address) updater.address = address
        if(req?.ifsc) updater.ifsc = ifsc
        if(req?.bankAccount) updater.bank_account = bankAccount
        if(req?.aadhaarNumber) updater.aadhaar_number = aadhaarNumber
        if(req?.panNumber) updater.pan_number = panNumber 
        if(req?.pinCode) updater.pin_number = pinCode 
        if(req?.city) updater.city = city 
        if(req?.state) updater.state = state 
        updater.country = req?.country || "India"
        if(req?.pickup_location) updater.pickup_location = pickup_location 
        if(address&&req?.pickup_location&&req?.country&&req?.city&&req?.state&&req?.pinCode&&email&&mobile&&name){
            let response = await createPickupLocation({address,pickup_location,country,city,state,pin_code : pinCode,email,phone : mobile,name})
            console.log("warehouse created : ",response);
            
        }
        const updateUser = await UserModel.findByIdAndUpdate(
            userId,
            updater,
            { new: true }
        )



        return response.json({
            message: "User Updated successfully",
            error: false,
            success: true,
            user: {
                name: updateUser?.name,
                _id: updateUser?._id,
                email: updateUser?.email,
                mobile: updateUser?.mobile,
                avatar: updateUser?.avatar
            }
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function toggleLiveController(request, response) {
  try {
    const userId = request.body?.userId;
    const userExist = await UserModel.findById(userId);
    
    if (!userExist) {
        return response.status(400).send("The user cannot be Updated!");
    }
    await UserModel.findByIdAndUpdate(userId,{isLiveEnabled:!userExist.isLiveEnabled})
    return response.json({
        message: "toggeled live successfully",
        error: false,
        success: true
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      success: false,
      error: true
    });
  }
}

//forgot password
export async function forgotPasswordController(request, response) {
    try {
        const { email } = request.body

        const user = await UserModel.findOne({ email: email })

        if (!user) {
            return response.status(400).json({
                message: "Email not available",
                error: true,
                success: false
            })
        }

        else {
            let verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

            user.otp = verifyCode;
            user.otpExpires = Date.now() + 600000;

            await user.save();
            sendEmail(verifyCode,user.email,user.name).then(async res=>{
                return response.json({
                    message: "check your email",
                    error: false,
                    success: true
                })
            }).catch(err=>{
                console.log(err);
                return response.json({
                    success: false,
                    error: true,
                    message: "OTP Generation Failed",
                })
            })
        }
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


export async function verifyForgotPasswordOtp(request, response) {
    try {
        const { email, otp } = request.body;

        const user = await UserModel.findOne({ email: email })

        console.log(user)

        if (!user) {
            return response.status(400).json({
                message: "Email not available",
                error: true,
                success: false
            })
        }

        if (!email || !otp) {
            return response.status(400).json({
                message: "Provide required field email, otp.",
                error: true,
                success: false
            })
        }

        if (otp !== user.otp) {
            return response.status(400).json({
                message: "Invailid OTP",
                error: true,
                success: false
            })
        }


        const currentTime = new Date().toISOString()

        if (user.otpExpires < currentTime) {
            return response.status(400).json({
                message: "Otp is expired",
                error: true,
                success: false
            })
        }


        user.otp = "";
        user.otpExpires = "";

        await user.save();

        return response.status(200).json({
            message: "Verify OTP successfully",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }

}


//reset password
export async function resetpassword(request, response) {
    try {
        const { email, newPassword, confirmPassword } = request.body;
        if (!email || !newPassword || !confirmPassword) {
            return response.status(400).json({
                error: true,
                success: false,
                message: "provide required fields email, newPassword, confirmPassword"
            })
        }

        const user = await UserModel.findOne({ email });
        if (!user) {
            return response.status(400).json({
                message: "Email is not available",
                error: true,
                success: false
            })
        }


        // if (user?.signUpWithGoogle === false) {
        //     const checkPassword = await bcryptjs.compare(oldPassword, user.password);
        //     if (!checkPassword) {
        //         return response.status(400).json({
        //             message: "your old password is wrong",
        //             error: true,
        //             success: false,
        //         })
        //     }
        // }


        if (newPassword !== confirmPassword) {
            return response.status(400).json({
                message: "newPassword and confirmPassword must be same.",
                error: true,
                success: false,
            })
        }

        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(confirmPassword, salt);

        user.password = hashPassword;
        user.signUpWithGoogle = false;
        await user.save();

        return response.json({
            message: "Password updated successfully.",
            error: false,
            success: true
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



//change password
export async function changePasswordController(request, response) {
    try {
        const { email, newPassword, confirmPassword } = request.body;
        if (!email || !newPassword || !confirmPassword) {
            return response.status(400).json({
                error: true,
                success: false,
                message: "provide required fields email, newPassword, confirmPassword"
            })
        }

        const user = await UserModel.findOne({ email });
        if (!user) {
            return response.status(400).json({
                message: "Email is not available",
                error: true,
                success: false
            })
        }


        if (newPassword !== confirmPassword) {
            return response.status(400).json({
                message: "newPassword and confirmPassword must be same.",
                error: true,
                success: false,
            })
        }

        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(confirmPassword, salt);

        user.password = hashPassword;
        user.signUpWithGoogle = false;
        await user.save();

        return response.json({
            message: "Password updated successfully.",
            error: false,
            success: true
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//refresh token controler
export async function refreshToken(request, response) {
    try {
        const refreshToken = request.cookies.refreshToken || request?.headers?.authorization?.split(" ")[1]  /// [ Bearer token]

        if (!refreshToken) {
            return response.status(401).json({
                message: "Invalid token",
                error: true,
                success: false
            })
        }


        const verifyToken = await jwt.verify(refreshToken, process.env.SECRET_KEY_REFRESH_TOKEN)
        if (!verifyToken) {
            return response.status(401).json({
                message: "token is expired",
                error: true,
                success: false
            })
        }

        const userId = verifyToken?._id;
        const newAccessToken = await generatedAccessToken(userId)

        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }

        response.cookie('accessToken', newAccessToken, cookiesOption)

        return response.json({
            message: "New Access token generated",
            error: false,
            success: true,
            data: {
                accessToken: newAccessToken
            }
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//get login user details
export async function userDetails(request, response) {
    try {
        const userId = request.userId

        const user = await UserModel.findById(userId).select('-password -refresh_token').populate('address_details')

        return response.json({
            message: 'user details',
            data: user,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: "Something is wrong",
            error: true,
            success: false
        })
    }
}


//review controller
export async function addReview(request, response) {
    try {

        const {image, userName, review, rating, userId, productId} = request.body;

        const userReview = new ReviewModel({
            image:image,
            userName:userName,
            review:review,
            rating:rating,
            userId:userId,
            productId:productId
        })


        await userReview.save();

        return response.json({
            message: "Review added successfully",
            error: false,
            success: true
        })
        
    } catch (error) {
        return response.status(500).json({
            message: "Something is wrong",
            error: true,
            success: false
        })
    }
}

//get reviews
export async function getReviews(request, response) {
    try {

        const productId = request.query.productId;
       

        const reviews = await ReviewModel.find({productId:productId});
        console.log(reviews)

        if(!reviews){
            return response.status(400).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            reviews:reviews
        })
        
    } catch (error) {
        return response.status(500).json({
            message: "Something is wrong",
            error: true,
            success: false
        })
    }
}




//get all reviews
export async function getAllReviews(request, response) {
    try {      

        const reviews = await ReviewModel.find();

        if(!reviews){
            return response.status(400).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            reviews:reviews
        })
        
    } catch (error) {
        return response.status(500).json({
            message: "Something is wrong",
            error: true,
            success: false
        })
    }
}


//get all users
export async function getAllUsers(request, response) {
    try {
        const { page, limit ,type } = request.query;

        let query ={}
        if(type) query.role = type.toUpperCase()
        const totalUsers = await UserModel.find(query);
        const users = await UserModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

        const total = await UserModel.countDocuments(users);

        if(!users){
            return response.status(400).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            users:users,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalUsersCount:totalUsers?.length,
            totalUsers:totalUsers
        })
        
    } catch (error) {
        return response.status(500).json({
            message: "Something is wrong",
            error: true,
            success: false
        })
    }
}



export async function deleteUser(request, response) {
    const user = await UserModel.findById(request.params.id);

    if (!user) {
        return response.status(404).json({
            message: "User Not found",
            error: true,
            success: false
        })
    }


    const deletedUser = await UserModel.findByIdAndDelete(request.params.id);

    if (!deletedUser) {
        response.status(404).json({
            message: "User not deleted!",
            success: false,
            error: true
        });
    }

    return response.status(200).json({
        success: true,
        error: false,
        message: "User Deleted!",
    });
}


//delete multiple products
export async function deleteMultiple(request, response) {
    const { ids } = request.body;

    if (!ids || !Array.isArray(ids)) {
        return response.status(400).json({ error: true, success: false, message: 'Invalid input' });
    }


    try {
        await UserModel.deleteMany({ _id: { $in: ids } });
        return response.status(200).json({
            message: "Users delete successfully",
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }

}

export async function updateFCMToken(request, response) {
  try {
    const userId = request.body?.userId;
    const token = request.body?.token;
    const userExist = await UserModel.findById(userId);
    
    if (!userExist) {
        return response.status(400).send("The user cannot be Updated!");
    }
    await UserModel.findByIdAndUpdate(userId,{fcm_token:token})
    return response.json({
        message: "token updated successfully",
        error: false,
        success: true
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || "something went wrong while updating token",
      success: false,
      error: true
    });
  }
}