import jwt from 'jsonwebtoken'

const auth = async (req, res, next) => {
    try {
        const token =
            req.cookies.accessToken ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Token missing" });
        }

        const decoded = jwt.verify(
            token,
            process.env.SECRET_KEY_ACCESS_TOKEN
        );

        req.userId = decoded.id;
        req.role = decoded.role;

        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Access token expired",
                tokenExpired: true
            });
        }

        return res.status(401).json({
            message: "Unauthorized"
        });
    }
};


export default auth