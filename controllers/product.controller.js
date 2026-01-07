import ProductModel from '../models/product.modal.js';
import ProductRAMSModel from '../models/productRAMS.js';
import ProductWEIGHTModel from '../models/productWEIGHT.js';
import ProductSIZEModel from '../models/productSIZE.js';
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { request } from 'http';
import decoder from '../middlewares/decoder.js';
import { s3 } from '../utils/awsConfig.js';
import videoModel from '../models/video.model.js';


cloudinary.config({
    cloud_name: process.env.cloudinary_Config_Cloud_Name,
    api_key: process.env.cloudinary_Config_api_key,
    api_secret: process.env.cloudinary_Config_api_secret,
    secure: true,
});


//image upload
var imagesArr = [];
export async function uploadImages(request, response) {
    try {
        imagesArr = [];

        const image = request.files;

        const options = {
            use_filename: true,
            unique_filename: false,
            overwrite: false,
        };

        for (let i = 0; i < image?.length; i++) {

            const img = await cloudinary.uploader.upload(
                image[i].path,
                options,
                function (error, result) {
                    imagesArr.push(result.secure_url);
                    fs.unlinkSync(`uploads/${request.files[i].filename}`);
                }
            );
        }

        return response.status(200).json({
            images: imagesArr
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

var bannerImage = [];
export async function uploadBannerImages(request, response) {
    try {
        bannerImage = [];

        const image = request.files;

        const options = {
            use_filename: true,
            unique_filename: false,
            overwrite: false,
        };

        for (let i = 0; i < image?.length; i++) {

            const img = await cloudinary.uploader.upload(
                image[i].path,
                options,
                function (error, result) {
                    bannerImage.push(result.secure_url);
                    fs.unlinkSync(`uploads/${request.files[i].filename}`);
                }
            );
        }

        return response.status(200).json({
            images: bannerImage
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//create product
export async function createProduct(request, response) {
    try {

        let product = new ProductModel({
            name: request.body.name,
            description: request.body.description,
            images: imagesArr,
            bannerimages: bannerImage,
            bannerTitleName: request.body.bannerTitleName,
            isDisplayOnHomeBanner: request.body.isDisplayOnHomeBanner,
            brand: request.body.brand,
            price: request.body.price,
            oldPrice: request.body.oldPrice,
            catName: request.body.catName,
            category: request.body.category,
            catId: request.body.catId,
            subCatId: request.body.subCatId,
            subCat: request.body.subCat,
            thirdsubCat: request.body.thirdsubCat,
            thirdsubCatId: request.body.thirdsubCatId,
            countInStock: request.body.countInStock,
            rating: request.body.rating,
            isFeatured: request.body.isFeatured,
            discount: request.body.discount,
            productRam: request.body.productRam,
            size: request.body.size,
            productWeight: request.body.productWeight,
            variants: request.body.variants,
            seller : request.body.seller,
            video_url : request.body.video_url,
            shipment_days : request.body.shipment_days,
            product_pincode : request.body.product_pincode
        });

        product = await product.save();


        if (!product) {
            response.status(500).json({
                error: true,
                success: false,
                message: "Product Not created"
            });
        }


        imagesArr = [];

        return response.status(200).json({
            message: "Product Created successfully",
            error: false,
            success: true,
            product: product
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



//get all products
export async function getAllProducts(request, response) {
    try {
        let token_data = await decoder(request)
        let role = token_data?.user.role
        let query = {}
        
        if(role == "SELLER") { 
            query.seller = token_data?.id
        }
        
        const { page, limit } = request.query;
        const totalProducts = await ProductModel.find(query);

        const products = await ProductModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

        const total = await ProductModel.countDocuments(products);

        if (!products) {
            return response.status(400).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalCount: totalProducts?.length,
            totalProducts: totalProducts
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//get all pending products
export async function getAllPendingProducts(request, response) {
    try {
        let token_data = await decoder(request)
        let role = token_data?.user.role
        console.log(request.params);
        
        let query = {isApproved:"false"}
        
        if(role == "SELLER") { 
            query.seller = token_data?.id
        }
        if(request?.params?.id!="null"){
            query.catId = request.params.id
        }
        console.log(query);
        
        const { page, limit } = request.query;
        const totalProducts = await ProductModel.find(query);

        const products = await ProductModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

        const total = await ProductModel.countDocuments(products);

        if (!products) {
            return response.status(400).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalCount: totalProducts?.length,
            totalProducts: totalProducts
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function approveProducts(request, response) {
    try {

        const {requestId,status} = request.body
        console.log("approveProducts",request.body);
        
        let query = {
            isApproved : true,
            status
        }

        const products = await ProductModel.findByIdAndUpdate(requestId,query)

        if (!products) {
            return response.status(400).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            message :  `${status} successfully`
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//get all products by category id
export async function getAllProductsByCatId(request, response) {
    try {
        let token_data = await decoder(request)
        let role = token_data?.user.role
        console.log(request.params);
        
        let query = {
            catId: request.params.id
        }
        
        if(role == "SELLER") { 
            query.seller = token_data?.id
        }

        const page = parseInt(request.query.page) || 1;
        const perPage = parseInt(request.query.perPage) || 10000;


        const totalPosts = await ProductModel.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return response.status(404).json(
                {
                    message: "Page not found",
                    success: false,
                    error: true
                }
            );
        }

        const products = await ProductModel.find(query).populate("category")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            totalPages: totalPages,
            page: page,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//get all products by category name
export async function getAllProductsByCatName(request, response) {
    try {
        let token_data = await decoder(request)
        let role = token_data?.user.role
        console.log(request.params);
        
        let query = {
            catName: request.query.catName
        }
        
        if(role == "SELLER") { 
            query.seller = token_data?.id
        }
        const page = parseInt(request.query.page) || 1;
        const perPage = parseInt(request.query.perPage) || 10000;


        const totalPosts = await ProductModel.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return response.status(404).json(
                {
                    message: "Page not found",
                    success: false,
                    error: true
                }
            );
        }


        const products = await ProductModel.find(query).populate("category")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            totalPages: totalPages,
            page: page,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



//get all products by sub category id
export async function getAllProductsBySubCatId(request, response) {
    try {
        let token_data = await decoder(request)
        let role = token_data?.user.role
        console.log(request.params);
        
        let query = {
            subCatId: request.params.id
        }
        
        if(role == "SELLER") { 
            query.seller = token_data?.id
        }

        const page = parseInt(request.query.page) || 1;
        const perPage = parseInt(request.query.perPage) || 10000;


        const totalPosts = await ProductModel.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return response.status(404).json(
                {
                    message: "Page not found",
                    success: false,
                    error: true
                }
            );
        }

        const products = await ProductModel.find(query).populate("category")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            totalPages: totalPages,
            page: page,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//get all pending products by sub category id
export async function getPendingProductsBySubCatId(request, response) {
    try {

        const page = parseInt(request.query.page) || 1;
        const perPage = parseInt(request.query.perPage) || 10000;


        const totalPosts = await ProductModel.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return response.status(404).json(
                {
                    message: "Page not found",
                    success: false,
                    error: true
                }
            );
        }

        const products = await ProductModel.find({
            subCatId: request.params.id,
            isApproved : false
        }).populate("category")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            totalPages: totalPages,
            page: page,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//get all products by sub category name
export async function getAllProductsBySubCatName(request, response) {
    try {

        const page = parseInt(request.query.page) || 1;
        const perPage = parseInt(request.query.perPage) || 10000;


        const totalPosts = await ProductModel.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return response.status(404).json(
                {
                    message: "Page not found",
                    success: false,
                    error: true
                }
            );
        }


        const products = await ProductModel.find({
            subCat: request.query.subCat
        }).populate("category")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            totalPages: totalPages,
            page: page,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const uploadVideoController = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description , user_id } = req.body;
    const file = req.file;
    console.log(req.file);
    
    if (!file) {
      return res.status(400).json({
        error: true,
        message: "Video file is required"
      });
    }

    if (!title) {
      return res.status(400).json({
        error: true,
        message: "Video title is required"
      });
    }

    const s3Key = `admin-videos/${Date.now()}-${file.originalname}`;
    const fileStream = fs.createReadStream(req.file.path);
    const uploadParams = {
      Bucket : process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: fileStream,
      ContentType: file.mimetype,
    //   ACL: "public-read"
    };

    const s3Result = await s3.upload(uploadParams).promise();

    const video = await videoModel.create({
      title,
      description,
      user_id,
      video_url: s3Result.Location,
      s3_key: s3Key,
      uploaded_by: userId,
      live_link : `d30jo9u7kdxiae.cloudfront.net/${s3Key}`
    });

    video.video_url = `d30jo9u7kdxiae.cloudfront.net/${s3Key}`

    return res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      video
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
};


//get all products by sub category id
export async function getAllProductsByThirdLavelCatId(request, response) {
    try {

        let token_data = await decoder(request)
        let role = token_data?.user.role
        console.log(request.params);
        let query = {
            thirdsubCatId: request.params.id
        }
        
        if(role == "SELLER") {
            query.seller = token_data?.id
        }
        const page = parseInt(request.query.page) || 1;
        const perPage = parseInt(request.query.perPage) || 10000;


        const totalPosts = await ProductModel.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return response.status(404).json(
                {
                    message: "Page not found",
                    success: false,
                    error: true
                }
            );
        }

        const products = await ProductModel.find(query).populate("category")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            totalPages: totalPages,
            page: page,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const deleteAdminVideo = async (req, res) => {
  try {
    const { id } = req.body;
    console.log(req.body);
    
    const video = await videoModel.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: video.s3_key
    }).promise();

    await video.deleteOne();

    res.json({ success: true, message: "Video deleted" });

  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

export const getAllAdminVideo = async (req, res) => {
  try {
    console.log(req.body);
    
    const video = await videoModel.find();

    if (!video.length) {
      return res.status(404).json({ message: "Video not found" });
    }

    
    res.json({ success: true, message: "Video fetched successfully" , video });

  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};


//get all products by sub category name
export async function getAllProductsByThirdLavelCatName(request, response) {
    try {
        let token_data = await decoder(request)
        let role = token_data?.user.role
        console.log(request.params);
        let query = {
            thirdsubCat: request.query.thirdsubCat
        }
        
        if(role == "SELLER") { 
            query.seller = token_data?.id
        }

        const page = parseInt(request.query.page) || 1;
        const perPage = parseInt(request.query.perPage) || 10000;


        const totalPosts = await ProductModel.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return response.status(404).json(
                {
                    message: "Page not found",
                    success: false,
                    error: true
                }
            );
        }


        const products = await ProductModel.find(query).populate("category")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            totalPages: totalPages,
            page: page,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//get all products by price

export async function getAllProductsByPrice(request, response) {
    let productList = [];

    if (request.query.catId !== "" && request.query.catId !== undefined) {
        const productListArr = await ProductModel.find({
            catId: request.query.catId,
        }).populate("category");

        productList = productListArr;
    }

    if (request.query.subCatId !== "" && request.query.subCatId !== undefined) {
        const productListArr = await ProductModel.find({
            subCatId: request.query.subCatId,
        }).populate("category");

        productList = productListArr;
    }


    if (request.query.thirdsubCatId !== "" && request.query.thirdsubCatId !== undefined) {
        const productListArr = await ProductModel.find({
            thirdsubCatId: request.query.thirdsubCatId,
        }).populate("category");

        productList = productListArr;
    }



    const filteredProducts = productList.filter((product) => {
        if (request.query.minPrice && product.price < parseInt(+request.query.minPrice)) {
            return false;
        }
        if (request.query.maxPrice && product.price > parseInt(+request.query.maxPrice)) {
            return false;
        }
        return true;
    });

    return response.status(200).json({
        error: false,
        success: true,
        products: filteredProducts,
        totalPages: 0,
        page: 0,
    });

}



//get all products by rating
export async function getAllProductsByRating(request, response) {
    try {

        const page = parseInt(request.query.page) || 1;
        const perPage = parseInt(request.query.perPage) || 10000;


        const totalPosts = await ProductModel.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return response.status(404).json(
                {
                    message: "Page not found",
                    success: false,
                    error: true
                }
            );
        }


        let products = [];

        if (request.query.catId !== undefined) {

            products = await ProductModel.find({
                rating: request.query.rating,
                catId: request.query.catId,

            }).populate("category")
                .skip((page - 1) * perPage)
                .limit(perPage)
                .exec();
        }

        if (request.query.subCatId !== undefined) {

            products = await ProductModel.find({
                rating: request.query.rating,
                subCatId: request.query.subCatId,

            }).populate("category")
                .skip((page - 1) * perPage)
                .limit(perPage)
                .exec();
        }


        if (request.query.thirdsubCatId !== undefined) {

            products = await ProductModel.find({
                rating: request.query.rating,
                thirdsubCatId: request.query.thirdsubCatId,

            }).populate("category")
                .skip((page - 1) * perPage)
                .limit(perPage)
                .exec();
        }


        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            totalPages: totalPages,
            page: page,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//get all products count

export async function getProductsCount(request, response) {
    try {
        const productsCount = await ProductModel.countDocuments();

        if (!productsCount) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            productCount: productsCount
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



//get all features products
export async function getAllFeaturedProducts(request, response) {
    try {

        const products = await ProductModel.find({
            isFeatured: true
        }).populate("category");

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//get all features products have banners
export async function getAllProductsBanners(request, response) {
    try {

        const products = await ProductModel.find({
            isDisplayOnHomeBanner: true
        }).populate("category");

        if (!products) {
            response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//delete product
export async function deleteProduct(request, response) {

    const product = await ProductModel.findById(request.params.id).populate("category");

    if (!product) {
        return response.status(404).json({
            message: "Product Not found",
            error: true,
            success: false
        })
    }

    const images = product.images;

    let img = "";
    for (img of images) {
        const imgUrl = img;
        const urlArr = imgUrl.split("/");
        const image = urlArr[urlArr.length - 1];

        const imageName = image.split(".")[0];

        if (imageName) {
            cloudinary.uploader.destroy(imageName, (error, result) => {
                // console.log(error, result);
            });
        }


    }

    const deletedProduct = await ProductModel.findByIdAndDelete(request.params.id);

    if (!deletedProduct) {
        response.status(404).json({
            message: "Product not deleted!",
            success: false,
            error: true
        });
    }

    return response.status(200).json({
        success: true,
        error: false,
        message: "Product Deleted!",
    });
}


//delete multiple products
export async function deleteMultipleProduct(request, response) {
    const { ids } = request.body;

    if (!ids || !Array.isArray(ids)) {
        return response.status(400).json({ error: true, success: false, message: 'Invalid input' });
    }


    for (let i = 0; i < ids?.length; i++) {
        const product = await ProductModel.findById(ids[i]);

        const images = product.images;

        let img = "";
        for (img of images) {
            const imgUrl = img;
            const urlArr = imgUrl.split("/");
            const image = urlArr[urlArr.length - 1];

            const imageName = image.split(".")[0];

            if (imageName) {
                cloudinary.uploader.destroy(imageName, (error, result) => {
                    // console.log(error, result);
                });
            }


        }

    }

    try {
        await ProductModel.deleteMany({ _id: { $in: ids } });
        return response.status(200).json({
            message: "Product delete successfully",
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

//get single product 
export async function getProduct(request, response) {
    try {
        const product = await ProductModel.findById(request.params.id).populate("category");

        if (!product) {
            return response.status(404).json({
                message: "The product is not found",
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            product: product
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//delete images
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


//updated product 
export async function updateProduct(request, response) {
    try {
        let token_data = await decoder(request)
        let role = token_data?.user.role
        const updater = {
                name: request.body.name,
                subCat: request.body.subCat,
                description: request.body.description,
                bannerimages: request.body.bannerimages,
                bannerTitleName: request.body.bannerTitleName,
                isDisplayOnHomeBanner: request.body.isDisplayOnHomeBanner,
                images: request.body.images,
                bannerTitleName: request.body.bannerTitleName,
                brand: request.body.brand,
                price: request.body.price,
                oldPrice: request.body.oldPrice,
                catId: request.body.catId,
                catName: request.body.catName,
                subCat: request.body.subCat,
                subCatId: request.body.subCatId,
                category: request.body.category,
                thirdsubCat: request.body.thirdsubCat,
                thirdsubCatId: request.body.thirdsubCatId,
                countInStock: request.body.countInStock,
                rating: request.body.rating,
                isFeatured: request.body.isFeatured,
                productRam: request.body.productRam,
                size: request.body.size,
                productWeight: request.body.productWeight,
                variants: request.body.variants,
                video_url : request.body.video_url,
                shipment_days : request.body.shipment_days,
                product_pincode : request.body.product_pincode
            }
        if(role == "SELLER") updater.isApproved = false 
        
        const product = await ProductModel.findByIdAndUpdate(
            request.params.id,
            updater,
            { new: true }
        );


        if (!product) {
            return response.status(404).json({
                message: "the product can not be updated!",
                status: false,
            });
        }

        imagesArr = [];

        return response.status(200).json({
            message: "The product is updated",
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




export async function createProductRAMS(request, response) {
    try {
        let productRAMS = new ProductRAMSModel({
            name: request.body.name
        })

        productRAMS = await productRAMS.save();

        if (!productRAMS) {
            response.status(500).json({
                error: true,
                success: false,
                message: "Product RAMS Not created"
            });
        }

        return response.status(200).json({
            message: "Product RAMS Created successfully",
            error: false,
            success: true,
            product: productRAMS
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



export async function deleteProductRAMS(request, response) {
    const productRams = await ProductRAMSModel.findById(request.params.id);

    if (!productRams) {
        return response.status(404).json({
            message: "Item Not found",
            error: true,
            success: false
        })
    }

    const deletedProductRams = await ProductRAMSModel.findByIdAndDelete(request.params.id);

    if (!deletedProductRams) {
        response.status(404).json({
            message: "Item not deleted!",
            success: false,
            error: true
        });
    }

    return response.status(200).json({
        success: true,
        error: false,
        message: "Product Ram Deleted!",
    });
}

export async function updateProductRam(request, response) {

    try {

        const productRam = await ProductRAMSModel.findByIdAndUpdate(
            request.params.id,
            {
                name: request.body.name,
            },
            { new: true }
        );


        if (!productRam) {
            return response.status(404).json({
                message: "the product Ram can not be updated!",
                status: false,
            });
        }

        return response.status(200).json({
            message: "The product Ram is updated",
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


export async function getProductRams(request, response) {

    try {

        const productRam = await ProductRAMSModel.find();

        if (!productRam) {
            return response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            data: productRam
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


export async function getProductRamsById(request, response) {

    try {

        const productRam = await ProductRAMSModel.findById(request.params.id);

        if (!productRam) {
            return response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            data: productRam
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



export async function createProductWEIGHT(request, response) {
    try {
        let productWeight = new ProductWEIGHTModel({
            name: request.body.name
        })

        productWeight = await productWeight.save();

        if (!productWeight) {
            response.status(500).json({
                error: true,
                success: false,
                message: "Product WEIGHT Not created"
            });
        }

        return response.status(200).json({
            message: "Product WEIGHT Created successfully",
            error: false,
            success: true,
            product: productWeight
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



export async function deleteProductWEIGHT(request, response) {
    const productWeight = await ProductWEIGHTModel.findById(request.params.id);

    if (!productWeight) {
        return response.status(404).json({
            message: "Item Not found",
            error: true,
            success: false
        })
    }

    const deletedProductWeight = await ProductWEIGHTModel.findByIdAndDelete(request.params.id);

    if (!deletedProductWeight) {
        response.status(404).json({
            message: "Item not deleted!",
            success: false,
            error: true
        });
    }

    return response.status(200).json({
        success: true,
        error: false,
        message: "Product Weight Deleted!",
    });
}


export async function updateProductWeight(request, response) {

    try {

        const productWeight = await ProductWEIGHTModel.findByIdAndUpdate(
            request.params.id,
            {
                name: request.body.name,
            },
            { new: true }
        );


        if (!productWeight) {
            return response.status(404).json({
                message: "the product weight can not be updated!",
                status: false,
            });
        }

        return response.status(200).json({
            message: "The product weight is updated",
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


export async function getProductWeight(request, response) {

    try {

        const productWeight = await ProductWEIGHTModel.find();

        if (!productWeight) {
            return response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            data: productWeight
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


export async function getProductWeightById(request, response) {

    try {

        const productWeight = await ProductWEIGHTModel.findById(request.params.id);

        if (!productWeight) {
            return response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            data: productWeight
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



export async function createProductSize(request, response) {
    try {
        let productSize = new ProductSIZEModel({
            name: request.body.name
        })

        productSize = await productSize.save();

        if (!productSize) {
            response.status(500).json({
                error: true,
                success: false,
                message: "Product size Not created"
            });
        }

        return response.status(200).json({
            message: "Product size Created successfully",
            error: false,
            success: true,
            product: productSize
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



export async function deleteProductSize(request, response) {
    const productSize = await ProductSIZEModel.findById(request.params.id);

    if (!productSize) {
        return response.status(404).json({
            message: "Item Not found",
            error: true,
            success: false
        })
    }

    const deletedProductSize = await ProductSIZEModel.findByIdAndDelete(request.params.id);

    if (!deletedProductSize) {
        response.status(404).json({
            message: "Item not deleted!",
            success: false,
            error: true
        });
    }

    return response.status(200).json({
        success: true,
        error: false,
        message: "Product size Deleted!",
    });
}


export async function updateProductSize(request, response) {

    try {

        const productSize = await ProductSIZEModel.findByIdAndUpdate(
            request.params.id,
            {
                name: request.body.name,
            },
            { new: true }
        );


        if (!productSize) {
            return response.status(404).json({
                message: "the product size can not be updated!",
                status: false,
            });
        }

        return response.status(200).json({
            message: "The product size is updated",
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


export async function getProductSize(request, response) {

    try {

        const productSize = await ProductSIZEModel.find();

        if (!productSize) {
            return response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            data: productSize
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


export async function getProductSizeById(request, response) {

    try {

        const productSize = await ProductSIZEModel.findById(request.params.id);

        if (!productSize) {
            return response.status(500).json({
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            error: false,
            success: true,
            data: productSize
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}



export async function filters(request, response) {
    const { catId, subCatId, thirdsubCatId, minPrice, maxPrice, rating, page, limit } = request.body;

    const filters = {}

    if (catId?.length) {
        filters.catId = { $in: catId }
    }

    if (subCatId?.length) {
        filters.subCatId = { $in: subCatId }
    }

    if (thirdsubCatId?.length) {
        filters.thirdsubCatId = { $in: thirdsubCatId }
    }

    if (minPrice || maxPrice) {
        filters.price = { $gte: +minPrice || 0, $lte: +maxPrice || Infinity };
    }

    if (rating?.length) {
        filters.rating = { $in: rating }
    }

    try {

        const products = await ProductModel.find(filters).populate("category").skip((page - 1) * limit).limit(parseInt(limit));

        const total = await ProductModel.countDocuments(filters);

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }


}


// Sort function
const sortItems = (products, sortBy, order) => {
    return products.sort((a, b) => {
        if (sortBy === 'name') {
            return order === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        }
        if (sortBy === 'price') {
            return order === 'asc' ? a.price - b.price : b.price - a.price;
        }
        return 0; // Default
    });
};


export async function sortBy(request, response) {
    const { products, sortBy, order } = request.body;
    const sortedItems = sortItems([...products?.products], sortBy, order);
    return response.status(200).json({
        error: false,
        success: true,
        products: sortedItems,
        totalPages: 0,
        page: 0,
    });
}




export async function searchProductController(request, response) {
    try {

        const {query, page, limit } = request.body;

        if (!query) {
            return response.status(400).json({
                error: true,
                success: false,
                message: "Query is required"
            });
        }


        const products = await ProductModel.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { brand: { $regex: query, $options: "i" } },
                { catName: { $regex: query, $options: "i" } },
                { subCat: { $regex: query, $options: "i" } },
                { thirdsubCat: { $regex: query, $options: "i" } },
            ],
        }).populate("category")

        const total = await products?.length

        return response.status(200).json({
            error: false,
            success: true,
            products: products,
            total: 1,
            page: parseInt(page),
            totalPages: 1
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}