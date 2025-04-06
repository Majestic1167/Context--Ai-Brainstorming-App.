import bcrypt from "bcrypt";
import collection from "../mongodb.js";

// GET Routes
export function getLoginPage(req, res) {
  res.render("Login", { error: null });
}

export function getSignupPage(req, res) {
  res.render("Signup", { error: null });
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
