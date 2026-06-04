// ============================================
// Role-Based Access Control (RBAC) Middleware
// ============================================

/**
 * Middleware to restrict route access to specific user roles.
 * Must be used AFTER authMiddleware (which populates req.user).
 *
 * @param {string[]} roles - Array of allowed roles (e.g. ['librarian', 'admin'])
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    // req.user is populated by authMiddleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Authentication required.",
      });
    }

    const { role } = req.user;

    // Check if the user's role is in the list of allowed roles
    if (!roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Access restricted to roles: [${roles.join(", ")}]. Your role: [${role}]`,
      });
    }

    // Role is valid, proceed
    next();
  };
};

export default checkRole;
