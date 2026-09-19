import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gate_tracker_jwt_secret_change_in_production_9f82b1c4';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No authentication token provided.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired authentication token.'
      });
    }

    req.user = decoded; // { userId, username }
    next();
  });
}

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
