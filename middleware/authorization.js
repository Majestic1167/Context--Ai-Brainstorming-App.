// Role-based authorization middleware
export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    next();
  };
};

// Example usage:
// router.get('/admin', checkRole(['admin']), (req, res) => {
//   res.render('admin-dashboard');
// });
