import Doctor from "../models/Doctor.js";

/**
 * Role-based access control middleware.
 * Must be used AFTER authMiddleware (which sets req.role from the JWT).
 *
 * Usage:
 *   router.post('/create', authMiddleware, requireDoctor, handler)
 *   router.post('/book',   authMiddleware, requirePatient, handler)
 */

export const requireDoctor = async (req, res, next) => {
  if (req.role !== 'doctor') {
    return res.status(403).json({
      msg: 'Access denied: this endpoint is for doctors only.',
    });
  }

  try {
    const doctor = await Doctor.findById(req.user).select("isVerified").lean();
    if (!doctor) {
      return res.status(404).json({ msg: "Doctor not found" });
    }

    if (!doctor.isVerified) {
      return res.status(403).json({
        msg: "Your account is pending verification. Please contact the MediRaksha admin to get approved.",
      });
    }

    next();
  } catch (error) {
    console.error("requireDoctor error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const requirePatient = (req, res, next) => {
  if (req.role !== 'patient') {
    return res.status(403).json({
      msg: 'Access denied: this endpoint is for patients only.',
    });
  }
  next();
};
