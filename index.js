import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser'
import morgan from 'morgan';
import helmet from 'helmet';
import connectDB from './config/connectDb.js';
import userRouter from './route/user.route.js'
import categoryRouter from './route/category.route.js';
import productRouter from './route/product.route.js';
import cartRouter from './route/cart.route.js';
import myListRouter from './route/mylist.route.js';
import addressRouter from './route/address.route.js';
import homeSlidesRouter from './route/homeSlides.route.js';
import bannerV1Router from './route/bannerV1.route.js';
import bannerList2Router from './route/bannerList2.route.js';
import blogRouter from './route/blog.route.js';
import orderRouter from './route/order.route.js';
import logoRouter from './route/logo.route.js';
import paymentRouter from './route/payment.route.js';

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "https://admin.fizzyfuzz.in",
    "https://seller.fizzyfuzz.in",
];
app.use(
    cors({
        origin: function (origin, callback) {
            // allow non-browser tools like Postman
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.options("*", cors());

app.use(express.json())
app.use(cookieParser())
app.use(helmet({
    crossOriginResourcePolicy: false
}))


app.get("/", (request, response) => {
    ///server to client
    console.log("connected");
    
    response.json({
        message: "Server is running " + process.env.PORT
    })
})


app.use('/api/user',userRouter)
app.use('/api/category',categoryRouter)
app.use('/api/product',productRouter);
app.use("/api/cart",cartRouter)
app.use("/api/myList",myListRouter)
app.use("/api/address",addressRouter)
app.use("/api/homeSlides",homeSlidesRouter)
app.use("/api/bannerV1",bannerV1Router)
app.use("/api/bannerList2",bannerList2Router)
app.use("/api/blog",blogRouter)
app.use("/api/payment",paymentRouter)

app.use("/api/order",orderRouter)
app.use("/api/logo",logoRouter)


connectDB().then(() => {
    app.listen(process.env.PORT,"0.0.0.0" , () => {
        console.log("Server is running", process.env.PORT);
    })
})