import { Router } from 'express'
import {addReview, authWithGoogle, changePasswordController, deleteMultiple, deleteUser, forgotPasswordController, getAllReviews, getAllUsers, getReviews, loginUserController, logoutController, refreshToken, registerSellerController, registerUserController, removeImageFromCloudinary, resendLoginOtpController, resetpassword, toggleLiveController, updateFCMToken, updateUserDetails, userAvatarController, userDetails, userKYCController, verifyForgotPasswordOtp, verifyLoginOtpController, verifyRegisterOtpController} from '../controllers/user.controller.js';
import auth from '../middlewares/auth.js';
import upload from '../middlewares/multer.js';

const userRouter = Router()
userRouter.post('/register',registerUserController)
userRouter.post('/sellerRegister',registerSellerController)
userRouter.post('/verifyRegisterOtp',verifyRegisterOtpController)
userRouter.post('/login',loginUserController)
userRouter.post('/verify-login-otp', verifyLoginOtpController);
userRouter.post('/resend-login-otp', resendLoginOtpController);
userRouter.post('/authWithGoogle',authWithGoogle)
userRouter.get('/logout',logoutController);
userRouter.put('/user-avatar',auth,upload.array('avatar'),userAvatarController);
userRouter.put('/upload-kyc',auth,upload.array('kycDocument',1),userKYCController);
userRouter.delete('/deteleImage',auth,removeImageFromCloudinary);
userRouter.post('/toggleUserLive',auth,toggleLiveController);
userRouter.put('/:id',auth,updateUserDetails);
userRouter.post('/forgot-password',forgotPasswordController)
userRouter.post('/verify-forgot-password-otp',verifyForgotPasswordOtp)
userRouter.post('/reset-password',resetpassword)
userRouter.post('/forgot-password/change-password',changePasswordController)
userRouter.post('/refresh-token',refreshToken)
userRouter.get('/user-details',auth,userDetails);
userRouter.post('/addReview',auth,addReview);
userRouter.get('/getReviews',getReviews);
userRouter.get('/getAllReviews',getAllReviews);
userRouter.get('/getAllUsers',getAllUsers);
userRouter.delete('/deleteMultiple',deleteMultiple);
userRouter.delete('/deleteUser/:id',deleteUser);
userRouter.post("/refresh-token",refreshToken);
userRouter.post("/updateFCM-token",updateFCMToken);


export default userRouter