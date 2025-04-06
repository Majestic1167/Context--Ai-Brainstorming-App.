import bcrypt from "bcrypt";
import crypto from "crypto"; // To generate a random verification code
import collection from "../mongodb.js";

// GET Routes
export function getLoginPage(req, res) {
  res.render("Login", { error: null });
}

export function getSignupPage(req, res) {
  res.render("Signup", { error: null });
}

export function getForgotpasswordPage(req, res) {
  res.render("Forgotpassword", { error: null }); // explicitly pass error
}

export function getverifycodePage(req, res) {
  res.render("Verifycode", { error: null }); // Make sure the error is passed explicitly
}

// GET route for /resetpassword
export function getResetPasswordPage(req, res) {
  res.render("ResetPassword", { error: null }); // Render the reset password page
}

// POST Routes

export function getLoggedinPage(req, res) {
  if (!req.session.user) {
    return res.status(401).send("Please login first!");
  }

  res.render("loggedin", { username: req.session.user.username });
}

// POST Routes

export async function handleLogin(req, res) {
  const { username, password } = req.body;

  // Check if input is a Gmail address or a phone number
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username); // This accepts any valid email
  const isPhone = /^[0-9]{9,15}$/.test(username); // Adjust the regex if needed

  console.log("Identifier: ", username); // Check the identifier

  let user;

  if (isEmail) {
    console.log("Checking email in database..."); // Debug log
    user = await collection.findOne({ email: username });
  } else if (isPhone) {
    console.log("Checking phone in database..."); // Debug log
    user = await collection.findOne({ phone: username });
  } else {
    return res.render("Login", {
      error: "Enter a valid Gmail or phone number!",
    });
  }

  if (!user) {
    console.log("User not found in database."); // Debug log
    return res.render("Login", { error: "User not found!" });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    console.log("Password mismatch."); // Debug log
    return res.render("Login", { error: "Invalid credentials!" });
  }

  req.session.user = user;
  res.redirect("/loggedin");
}

//signup
export async function handleSignup(req, res) {
  const { username, email, phone, password, confirmPassword, name } = req.body;

  if (password !== confirmPassword) {
    return res.render("Signup", { error: "Passwords do not match!" });
  }

  // Check if email is a valid Gmail address
  if (!/^[^\s@]+@gmail\.com$/.test(email)) {
    return res.render("Signup", { error: "Only Gmail addresses are allowed!" });
  }

  // Check if phone number is valid (between 9 to 15 digits)
  if (!/^[0-9]{9,15}$/.test(phone)) {
    return res.render("Signup", { error: "Enter a valid phone number!" });
  }

  try {
    // Check if the email or phone number already exists in the database
    const existingUser = await collection.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.render("Signup", {
        error: "Email or phone number already exists!",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new collection({
      name,
      username,
      email,
      phone,
      password: hashedPassword,
    });

    // Save the new user to the database
    await newUser.save();

    // Redirect to login page
    res.redirect("/login");
  } catch (error) {
    console.error("Error saving user data:", error);
    res.render("Signup", { error: "Something went wrong. Please try again." });
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
    const user = await collection.findOne({
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
  const user = await collection.findOneAndUpdate(
    { email: req.session.userEmail }, // Use the email stored in the session
    { $set: { password: hashedPassword } },
    { new: true }
  );

  if (!user) {
    return res.render("ResetPassword", { error: "User not found!" });
  }

  // Redirect the user to the login page after resetting the password
  res.redirect("/login");
}
