const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { decrypt } = require('../encryption/crypto');

const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const upload = multer();

router.put('/profile', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const {
      newUsername,
      newDisplayName,
      newBio
    } = req.body;
    const profilePicture = req.file ? req.file.buffer : null;
    const user = await User.updateProfile(
      req.user.username,
      newUsername,
      newDisplayName,
      newBio,
      profilePicture
    );
    const token = newUsername ? jwt.sign({
      username: newUsername
    }, JWT_SECRET) : null;
    res.json({
      username: decrypt(user.username),
      displayName: decrypt(user.displayName),
      bio: decrypt(user.bio || ''),
      followers: user.followers.length,
      following: user.following.length,
      token
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

router.get('/profile/me', auth, (req, res) => {
  const user = User.getAllUsers().find(u => decrypt(u.username) === req.user.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    username: decrypt(user.username),
    displayName: decrypt(user.displayName || user.username),
    bio: decrypt(user.bio || ''),
    followers: user.followers.length,
    following: user.following.length
  });
});

router.get('/profile/:username', auth, (req, res) => {
  const user = User.getAllUsers().find(u => decrypt(u.username) === req.params.username);
  if (!user) {
    return res.json({
      username: 'null',
      displayName: 'Nonexistant User',
      bio: '',
      followers: 9999,
      following: 9999
    });
  }

  res.json({
    username: decrypt(user.username),
    displayName: decrypt(user.displayName || user.username),
    bio: decrypt(user.bio || ''),
    followers: user.followers.length,
    following: user.following.length
  });
});

router.get('/profile-picture/:username', async (req, res) => {
  try {
    const image = await User.getProfilePicture(req.params.username);
    res.setHeader('Content-Type', 'image/png');
    res.send(image);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/follow/:id', auth, (req, res) => {
  const user = User.followUser(req.user.id, req.params.id);
  res.json(user);
});

module.exports = router;