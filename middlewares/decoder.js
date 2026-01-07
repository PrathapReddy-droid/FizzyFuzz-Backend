import jwt from 'jsonwebtoken'

const decoder = async(request)=>{
    try {
        const token = request.cookies.accessToken || request?.headers?.authorization?.split(" ")[1];
        if(!token){
            return response.status(401).json({
                message : "Provide token"
            })
        }
        const decode = await jwt.verify(token,process.env.SECRET_KEY_ACCESS_TOKEN);
        return (decode)
    }catch(err){
        console.log(err);
        return null
    }
}

export default decoder