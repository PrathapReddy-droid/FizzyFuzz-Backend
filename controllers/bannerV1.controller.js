import BannerV1Model from '../models/bannerV1.model.js';

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { s3 } from '../utils/awsConfig.js';


cloudinary.config({
    cloud_name: process.env.cloudinary_Config_Cloud_Name,
    api_key: process.env.cloudinary_Config_api_key,
    api_secret: process.env.cloudinary_Config_api_secret,
    secure: true,
});


//image upload
var imagesArr = [];
export async function uploadImages(req, res) {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({
        success: false,
        message: "No images received",
      });
    }

    const imagesArr = [];

    for (const file of req.files) {
      if (!file.buffer) {
        throw new Error("File buffer missing — multer memoryStorage not used");
      }

      // Optional safety check
      if (!file.mimetype.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }

      const s3Key = `product-images/${Date.now()}-${file.originalname}`;

      await s3.upload({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,          // ✅ buffer instead of path
        ContentType: file.mimetype,
      }).promise();

      imagesArr.push(
        `https://d30jo9u7kdxiae.cloudfront.net/${s3Key}`
      );
    }

    return res.status(200).json({
      success: true,
      images: imagesArr,
    });

  } catch (error) {
    console.error("S3 Image Upload Error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || error,
    });
  }
}




//add banner
export async function addBanner(request, response) {
    try {
        let banner = new BannerV1Model({
            bannerTitle: request.body.bannerTitle,
            images: imagesArr,
            catId: request.body.catId,
            subCatId: request.body.subCatId,
            thirdsubCatId: request.body.thirdsubCatId,
            price: request.body.price,
            alignInfo:request.body.alignInfo
        });

        if (!banner) {
            return response.status(500).json({
                message: "banner not created",
                error: true,
                success: false
            })
        }

        banner = await banner.save();

        imagesArr = [];

        return response.status(200).json({
            message: "banner created",
            error: false,
            success: true,
            banner: banner
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}





//get Categories
export async function getBanners(request, response) {
    try {
        const banners = await BannerV1Model.find();

        if (!banners) {
            response.status(500).json({
                error: true,
                success: false
            })
        }


        return response.status(200).json({
            error: false,
            success: true,
            data: banners
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}


//get single category

export async function getBanner(request, response) {
    try {
        const banner = await BannerV1Model.findById(request.params.id);


        if (!banner) {
            response.status(500)
                .json(
                    {
                        message: "The banner with the given ID was not found.",
                        error: true,
                        success: false
                    }
                );
        }


        return response.status(200).json({
            error: false,
            success: true,
            banner: banner
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function deleteBanner(req, res) {
  const deletedBanner = await BannerV1Model.findByIdAndDelete(req.params.id);

  if (!deletedBanner) {
    return res.status(404).json({
      success: false,
      error: true,
      message: "Banner not found!",
    });
  }

  return res.status(200).json({
    success: true,
    error: false,
    message: "Banner deleted successfully!",
  });
}




export async function updatedBanner(request, response) {
    const banner = await BannerV1Model.findByIdAndUpdate(
        request.params.id,
        {
            bannerTitle: request.body.bannerTitle,
            images: imagesArr.length > 0 ? imagesArr[0] : request.body.images,
            catId: request.body.catId,
            subCatId: request.body.subCatId,
            thirdsubCatId: request.body.thirdsubCatId,
            price: request.body.price,
            alignInfo:request.body.alignInfo
        },
        { new: true }
    );

    if (!banner) {
        return response.status(500).json({
            message: "banner cannot be updated!",
            success: false,
            error: true
        });
    }


    imagesArr = [];

    response.status(200).json({
        error: false,
        success: true,
        banner: banner,
        message: "banner updated successfully"
    })

}