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
  const users = User.getAllUsers();
  const user = users.find(u => decrypt(u.username) === req.user.username);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const response = {
    username: decrypt(user.username),
    displayName: decrypt(user.displayName || user.username),
    bio: decrypt(user.bio || ''),
    followers: user.followers.length,
    following: user.following.length,
    badge: user.badge ? decrypt(user.badge) : null
  };

  res.json(response);
});

router.get('/profile/:username', auth, (req, res) => {
  const username = req.params.username;
  const users = User.getAllUsers();
  const user = users.find(u => decrypt(u.username) === username);
  
  if (!user) {
    return res.json({
      username: 'null',
      displayName: 'Nonexistent User',
      bio: '',
      followers: 0,
      following: 0,
      isFollowing: false,
      badge: ''
    });
  }

  const currentUser = users.find(u => decrypt(u.username) === req.user.username);
  const isOwnProfile = req.user.username === decrypt(user.username);

  const response = {
    username: decrypt(user.username),
    displayName: decrypt(user.displayName || user.username),
    bio: decrypt(user.bio || ''),
    followers: user.followers.length,
    following: user.following.length,
    isFollowing: user.followers.includes(currentUser.username),
    badge: user.badge ? decrypt(user.badge) : ''
  };

  res.json(response);
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

router.post('/follow/:username', auth, (req, res) => {
  try {
    const result = User.followUser(req.user.username, req.params.username);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/unfollow/:username', auth, (req, res) => {
  try {
    const result = User.unfollowUser(req.user.username, req.params.username);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.get('/:username/:type', auth, (req, res) => {
  try {
    const { username, type } = req.params;
    
    if (type !== 'followers' && type !== 'following') {
      return res.status(400).json({ error: 'Invalid connection type' });
    }

    const users = User.getAllUsers();
    const targetUser = users.find(u => decrypt(u.username) === username);
    const currentUser = users.find(u => decrypt(u.username) === req.user.username);
    const isOwnProfile = req.user.username === username;

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const connections = type === 'followers' ? targetUser.followers : targetUser.following;
    
    if (connections.length === 0) {
      const sadQuotes = type === 'followers' 
        ? ["Desperate times call for desperate measures.", "Nobody here but us chickens.", "It's lonely at the bottom."]
        : ["Make some friends maybe.", "Time to go outside.", "The void stares back."];
      return res.json({
        displayName: decrypt(targetUser.displayName || targetUser.username),
        connections: [],
        emptyMessage: sadQuotes[Math.floor(Math.random() * sadQuotes.length)]
      });
    }

    const connectionUsers = connections
      .map(encryptedUsername => {
        const user = users.find(u => u.username === encryptedUsername);
        if (!user) return null;

        return {
          username: decrypt(user.username),
          displayName: decrypt(user.displayName || user.username),
          badge: user.badge ? decrypt(user.badge) : '',
          followers: user.followers.length,
          following: user.following.length,
          isFollowedByMe: currentUser.following.includes(user.username),
          followsMe: user.following.includes(currentUser.username)
        };
      })
      .filter(user => user !== null);

    res.json({
      displayName: decrypt(targetUser.displayName || targetUser.username),
      connections: connectionUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;