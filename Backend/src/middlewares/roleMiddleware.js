/**
 * Role-based access control middleware.
 * Must be used AFTER authMiddleware (which sets req.role from the JWT).
 *
 * Usage:
 *   router.post('/create', authMiddleware, requireDoctor, handler)
 *   router.post('/book',   authMiddleware, requirePatient, handler)
 */

export const requireDoctor = (req, res, next) => {
  if (req.role !== 'doctor') {
    return res.status(403).json({
      msg: 'Access denied: this endpoint is for doctors only.',
    });
  }
  next();
};

export const requirePatient = (req, res, next) => {
  if (req.role !== 'patient') {
    return res.status(403).json({
      msg: 'Access denied: this endpoint is for patients only.',
    });
  }
  next();
};
