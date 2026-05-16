import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Read JWT_SECRET inline — not at module load — so dotenv is guaranteed to have run first
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    req.role = decoded.role; // 'patient' | 'doctor'
    next();
  } catch (err) {
    console.error('authMiddleware token error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

export default authMiddleware;