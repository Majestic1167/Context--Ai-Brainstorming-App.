import passport from "passport";
import bcrypt from "bcrypt";
import LocalStrategy from "passport-local";
import User from "../models/User.js";

passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ username });
        console.log("Found user:", user);

        if (!user) {
          return done(null, false, { message: "Incorrect credentials" });
        }

        // Log the entered password and stored hash
        console.log("Entered password:", password);
        console.log("Stored hash:", user.password);

        // Compare the entered password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);

        console.log("Password match:", isMatch);

        if (!isMatch) {
          return done(null, false, { message: "Incorrect Password" });
        }

        return done(null, user); // Authentication successful
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user to save user id in session
passport.serializeUser((user, done) => {
  done(null, {
    _id: user._id,
    username: user.username,
    isAdmin: user.isAdmin,
  });
});

// Deserialize user to retrieve the user object from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
