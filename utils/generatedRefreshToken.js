import UserModel from "../models/user.model.js"
import jwt from 'jsonwebtoken'

const genertedRefreshToken = async(user)=>{
    const token = await jwt.sign({ id : user._id, user},
        process.env.SECRET_KEY_REFRESH_TOKEN,
        { expiresIn : '7d'}
    )

    const updateRefreshTokenUser = await UserModel.updateOne(
        { _id : user._id},
        {
            refresh_token : token
        }
    )

    return token
}

export default genertedRefreshToken