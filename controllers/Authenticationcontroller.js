
export function getLoginPage(req, res) {
    res.render("Login"); // Renders login.ejs
  };
  
  export function getSignupPage(req, res) {
    res.render("Signup"); // Renders signup.ejs
  };
  
  export function getLoggedinPage(req, res) {
    res.render("loggedin"); // Renders loggedin.ejs
  };