import UserModel from "../models/user.model.js"
import jwt from 'jsonwebtoken'

const genertedRefreshToken = async (user) => {
    const token = jwt.sign(
        { id: user._id , user : {_id:user._id , role : user.role}},
        process.env.SECRET_KEY_REFRESH_TOKEN,
        { expiresIn: "7d" }
    );

    await UserModel.updateOne(
        { _id: user._id },
        { refresh_token: token }
    );

    return token;
};

export default genertedRefreshToken