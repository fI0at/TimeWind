const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const User = require('../models/User');
const { decrypt } = require('../encryption/crypto');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = User.getAllUsers();
    const user = users.find(u => decrypt(u.username) === decoded.username);
    
    if (!user) {
      throw new Error('User not found');
    }

    req.user = {
      username: decoded.username,
      id: user.username // Using encrypted username as ID
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;