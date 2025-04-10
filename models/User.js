import mongoose from "mongoose";
import bcrypt from "bcrypt"; // Use bcryptjs for hashing and comparison

// Define User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
  },
  password: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("Hashed Password:", this.password); // Log the hashed password
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare entered password with the hashed password
userSchema.methods.comparePassword = async function (password) {
  console.log("Comparing password:", password);
  return bcrypt.compare(password, this.password); // Use bcryptjs for comparison
};

const User = mongoose.model("User", userSchema);

export default User;
