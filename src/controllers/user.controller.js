import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const AccessToken = user.generateAccessToken()
        const RefreshToken = user.generateRefreshToken()

        user.RefreshToken = RefreshToken
        await user.save({validateBeforeSave: false})

        return {AccessToken, RefreshToken}

    }
    catch (error){
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    const {fullname, email, username, password} = req.body
    console.log("email: ",email);

    if([fullname, email, username, password].some( (field)=>
        field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!userCreated){
        throw new ApiError(500,"Error while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, userCreated, "User registered successfully")
    )

})

const loginUser = asyncHandler(async(req,res)=>{
    //req body ->data
    // username / email
    //find the user 
    //password check
    //access and refresh tokens
    //send cookies

    const {email, username, password} = req.body

    if(!username || !email){
        throw new ApiError(400,'Username or password is required')
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,'User does not exist')
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, 'Invalid credentials')
    }

    const {AccessToken,RefreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken",AccessToken, options).cookie("refreshToken",RefreshToken.options).json(
        new ApiResponse(200, {
            user: loggedInUser, AccessToken, RefreshToken
        },"User loggen in successfully")
    )

})

const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options ={
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken",options).json(new ApiResponse(200, {}, "User logged out"))
    
})

export {registerUser,loginUser,logoutUser}