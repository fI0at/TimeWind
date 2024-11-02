const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/config');
const { decrypt } = require('../encryption/crypto');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
      const { username, email, password } = req.body;
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
                req.socket.remoteAddress;
      const user = await User.createUser(username, email, password, ip);
      const token = jwt.sign({ username: decrypt(user.username) }, JWT_SECRET);
      res.json({ token });
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = User.getAllUsers();
        const user = users.find(u => decrypt(u.username) === username.toLowerCase());

        if (!user || !await bcrypt.compare(password, user.password)) {
            throw new Error('Invalid credentials');
        }

        const token = jwt.sign({ username: decrypt(user.username) }, JWT_SECRET);
        res.json({ token });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

module.exports = router;