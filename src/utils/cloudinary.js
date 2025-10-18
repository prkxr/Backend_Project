import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUDNAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath) => {
    try{
        if(!localFilePath) return null
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("file uploaded successfully",response.url);
        return response;
    }
    catch (error){
        fs.unlinkSync(localFilePath)

    }
}

// cloudinary.v2.uploader
// .upload("dog.mp4", {
//   resource_type: "video", 
//   public_id: "my_dog",
//   overwrite: true, 
//   notification_url: "https://mysite.example.com/notify_endpoint"})
// .then(result=>console.log(result));