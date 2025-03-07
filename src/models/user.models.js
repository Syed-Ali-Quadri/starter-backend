import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: [true, "Username must be unique"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: [true, "Email must be unique"],
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true
    },
    avatar: {
        type: String,
        trim: true,
        default: ""
    },
    coverImage: {
        type: String,
        trim: true,
        default: ""
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters long"],
        maxlength: [16, "Password must be at most 16 characters long"]
    },
    refreshToken: {
        type: String,
        trim: true
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Video'
    }],
    role: { 
        type: String, 
        enum: ["user", "admin", "owner"], 
        default: "user" 
    }
}, { timestamps: true });

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
        this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.getAccessToken = function() {
    return jwt.sign({
        _id: this._id,
        username: this.username,
        email: this.email,
        fullName: this.fullName
    }, 
        process.env.ACCESS_TOKEN_SECRET, 
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
}

userSchema.methods.getRefreshToken = function() {
    return jwt.sign({
        _id: this._id
    }, 
        process.env.REFRESH_TOKEN_SECRET, 
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })
}

export const User = mongoose.model('User', userSchema);