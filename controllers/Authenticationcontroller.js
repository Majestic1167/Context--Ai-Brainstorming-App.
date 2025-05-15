import bcrypt from "bcrypt";
import crypto from "crypto"; // To generate a random verification code
import User from "../models/User.js";
import fs from "fs";
import passport from "passport";

// GET Rouutes(this needs to be used done in the middleware)
export function getLoginPage(req, res) {
  res.render("login", {
    user: req.user || null,
    error: null,
  });
}

// GET: Logged-in Page
export function getLoggedinPage(req, res) {
  res.render("loggedin", { user: req.user });
}

export function getSignupPage(req, res) {
  res.render("Signup", { error: null });
}

export function getForgotpasswordPage(req, res) {
  res.render("Forgotpassword", { error: null });
}

export function getverifycodePage(req, res) {
  res.render("Verifycode", { error: null });
}

// GET route for /resetpassword
export function getResetPasswordPage(req, res) {
  res.render("ResetPassword", { error: null });
}

export async function handleSignup(req, res) {
  const { username, email, phone, password, confirmPassword, name } = req.body;
  const formData = { username, email, phone, name };
  let uploadedFilePath = null;

  try {
    // 1. First validate all inputs (before handling file)
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match!");
    }

    if (!/^[^\s@]+@gmail\.com$/.test(email)) {
      throw new Error("Only Gmail addresses are allowed!");
    }

    if (!/^[0-9]{9,15}$/.test(phone)) {
      throw new Error("Enter a valid phone number (9-15 digits)!");
    }

    // 2. Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { username }],
    });

    if (existingUser) {
      let errorMessage = "Account with this ";
      if (existingUser.email === email) errorMessage += "email";
      else if (existingUser.phone === phone) errorMessage += "phone number";
      else errorMessage += "username";
      throw new Error(errorMessage + " already exists!");
    }

    const profilePictureFilename = req.file ? req.file.filename : "default.jpg";

    const newUser = new User({
      name,
      username,
      email,
      phone,
      password,
      profilePicture: profilePictureFilename,
    });

    await newUser.save();
    return res.redirect("/login");
  } catch (error) {
    // 5. Clean up uploaded file if error occurred
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlink(uploadedFilePath, (err) => {
        if (err) console.error("Error deleting uploaded file:", err);
      });
    }

    console.error("Signup error:", error);
    return res.render("Signup", {
      error: error.message,
      formData,
    });
  }
}
export async function handleForgotPassword(req, res) {
  const { identifier } = req.body; // Get the identifier (email or phone)

  // Check if the input is email or phone
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isPhone = /^[0-9]{9,15}$/.test(identifier);

  if (!isEmail && !isPhone) {
    return res.render("Forgotpassword", {
      error: "Enter a valid Gmail or phone number!",
    });
  }

  try {
    // Find the user by email or phone number in the database
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.render("Forgotpassword", {
        error: "User not found!",
      });
    }

    // Generate a random 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store the verification code and identifier in the session
    req.session.verificationCode = verificationCode;
    req.session.identifier = identifier;
    req.session.userEmail = user.email; // Store the email for password reset

    // Optionally, send the code to the user's email or phone (not implemented here)
    console.log(`Verification code for ${identifier}: ${verificationCode}`);

    // Redirect to the verification code page
    res.redirect("/verifycode");
  } catch (error) {
    console.error("Error in forgot password:", error);
    return res.render("Forgotpassword", {
      error: "Something went wrong. Please try again.",
    });
  }
}

export async function handleVerifyCode(req, res) {
  const { code } = req.body; // Get the entered verification code

  // Check if the code exists in the session
  if (!req.session.verificationCode) {
    return res.render("Verifycode", {
      error: "Session expired. Please try again.",
    });
  }

  // Compare the entered code with the stored verification code
  if (code === req.session.verificationCode) {
    // If the codes match, redirect to the password reset page
    res.redirect("/resetpassword");
  } else {
    // If the codes don't match, show an error message
    res.render("Verifycode", { error: "Invalid verification code!" });
  }
}

// POST route to handle password reset
export async function handleResetPassword(req, res) {
  const { password, confirmPassword } = req.body;

  // Check if the passwords match
  if (password !== confirmPassword) {
    return res.render("ResetPassword", { error: "Passwords do not match!" });
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Find the user in the database and update their password
  const user = await User.findOneAndUpdate(
    { email: req.session.userEmail },
    { $set: { password: hashedPassword } },
    { new: true }
  );

  if (!user) {
    return res.render("ResetPassword", { error: "User not found!" });
  }

  // Redirect the user to the login page after resetting the password
  res.redirect("/login");
}

export function handleLogin(req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect("/login");

    if (user.isBlocked) {
      return res.render("login", {
        error: "Your account has been blocked. Please contact support.",
      });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      req.session.user = {
        _id: user._id,
        username: user.username,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
      };
      req.session.userId = user._id;

      console.log("User logged in:", req.session.user);
      return res.redirect("/loggedin");
    });
  })(req, res, next);
}
