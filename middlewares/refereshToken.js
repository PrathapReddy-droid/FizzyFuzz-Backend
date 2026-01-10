import jwt from 'jsonwebtoken'

const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing" });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.SECRET_KEY_REFRESH_TOKEN
        );

        const user = await UserModel.findById(decoded.id);

        if (!user || user.refresh_token !== refreshToken) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        const newAccessToken = generateAccessToken(user);

        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        });

        return res.json({ success: true });

    } catch (error) {
        return res.status(403).json({
            message: "Refresh token expired"
        });
    }
}

export default refreshToken