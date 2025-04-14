// Ensure user is logged in before accessing route
export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// Prevent logged-in users from accessing login/signup pages
export function redirectIfAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/loggedin");
  }
  next();
}
