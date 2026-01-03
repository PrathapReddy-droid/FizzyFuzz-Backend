import jwt from 'jsonwebtoken'

const generatedAccessToken = async (user) => {
    const token = await jwt.sign(
        { id: user._id , user : user},
        process.env.SECRET_KEY_ACCESS_TOKEN,
        { expiresIn: '24h' }
    )

    return token
}

export default generatedAccessToken