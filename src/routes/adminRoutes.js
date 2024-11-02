const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { decrypt } = require('../encryption/crypto');

const router = express.Router();

function isAdmin(req, res, next) {
  const users = User.getAllUsers();
  const user = users.find(u => decrypt(u.username) === req.user.username);
  
  if (!user || user.badge !== 'administrator') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  next();
}

router.get('/users', auth, isAdmin, (req, res) => {
  const users = User.getAllUsers().map(user => ({
    username: decrypt(user.username),
    displayName: decrypt(user.displayName),
    badge: user.badge || ''
  }));
  
  res.json(users);
});

router.put('/users/:username/badge', auth, isAdmin, (req, res) => {
  try {
    const { badge } = req.body;
    const users = User.getAllUsers();
    const user = users.find(u => decrypt(u.username) === req.params.username);
    if (!user) throw new Error('User not found');
    
    user.badge = badge;
    User.saveUsers(users);
    
    res.json({
      username: decrypt(user.username),
      badge: user.badge
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 