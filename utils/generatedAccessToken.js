import jwt from 'jsonwebtoken'

const generatedAccessToken = async (user) => {
    const token = await jwt.sign(
        { id: user._id , user : {role : user.role, _id : user._id}},
        process.env.SECRET_KEY_ACCESS_TOKEN,
        { expiresIn: '15m' }
    )

    return token
}

export default generatedAccessToken