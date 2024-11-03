const express = require('express');
const Wind = require('../models/Wind');
const auth = require('../middleware/auth');
const algorithmService = require('../services/algorithmService');
const User = require('../models/User');
const { encrypt, decrypt } = require('../encryption/crypto');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const users = User.getAllUsers();
  const user = users.find(u => decrypt(u.username) === req.user.username);
  const location = req.body.location || null;
  
  const wind = Wind.createWind(req.user.id, req.body.content, location);
  res.json({
    ...wind,
    content: decrypt(wind.content),
    username: req.user.username
  });
});

router.post('/:id/like', auth, (req, res) => {
  const wind = Wind.likeWind(req.params.id, req.user.id);
  res.json(wind);
});

router.post('/:id/reply', auth, (req, res) => {
  const reply = Wind.replyToWind(req.params.id, req.user.id, req.body.content);
  res.json(reply);
});

router.get('/feed', auth, (req, res) => {
  const users = User.getAllUsers();
  const user = users.find(u => decrypt(u.username) === req.user.username);
  const winds = Wind.getAllWinds();
  
  const userLocation = user?.location ? JSON.parse(decrypt(user.location)) : null;
  
  const feed = winds.map(wind => {
    const windUser = users.find(u => u.username === wind.userId);
    if (!windUser) {
      return null;
    }
    
    const windLocation = wind.location ? JSON.parse(decrypt(wind.location)) : null;
    
    const score = algorithmService.calculateWindScore(
      wind, 
      req.user.id, 
      user?.following || [],
      userLocation,
      windLocation
    );
    
    return {
      ...wind,
      score,
      content: decrypt(wind.content),
      username: decrypt(windUser.username),
      displayName: decrypt(windUser.displayName || windUser.username),
      badge: windUser.badge ? decrypt(windUser.badge) : '',
      isLiked: wind.likes.includes(req.user.id)
    };
  })
  .filter(wind => wind !== null)
  .sort((a, b) => b.score - a.score);

  res.json(feed);
});

router.get('/user', auth, (req, res) => {
  const winds = Wind.getAllWinds()
      .filter(wind => wind.userId === req.user.id)
      .map(wind => ({
          ...wind,
          content: decrypt(wind.content)
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(winds);
});

router.get('/user/:username?', auth, (req, res) => {
  const username = req.params.username || req.user.username;
  const users = User.getAllUsers();
  const targetUser = users.find(u => decrypt(u.username) === username);
  
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const winds = Wind.getAllWinds()
    .filter(wind => wind.userId === targetUser.username)
    .map(wind => ({
      ...wind,
      content: decrypt(wind.content),
      username: decrypt(targetUser.username),
      displayName: decrypt(targetUser.displayName || targetUser.username),
      badge: targetUser.badge ? decrypt(targetUser.badge) : '',
      isLiked: wind.likes.includes(req.user.id)
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
  res.json(winds);
});

router.delete('/:id', auth, (req, res) => {
  try {
    const winds = Wind.getAllWinds();
    const wind = winds.find(t => t.id === req.params.id);
    const users = User.getAllUsers();
    const user = users.find(u => decrypt(u.username) === req.user.username);
    
    if (!wind) {
      return res.status(404).json({ error: 'Wind not found' });
    }
    
    if (wind.userId !== req.user.id && (!user.badge || decrypt(user.badge).toLowerCase() !== 'administrator')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updatedWinds = winds.filter(t => t.id !== req.params.id);
    Wind.saveWinds(updatedWinds);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, (req, res) => {
  const winds = Wind.getAllWinds();
  const wind = winds.find(w => w.id === req.params.id);
  
  if (!wind) {
    return res.status(404).json({ error: 'Wind not found' });
  }

  const users = User.getAllUsers();
  const windUser = users.find(u => u.username === wind.userId);
  
  if (!windUser) {
    return res.status(404).json({ error: 'Wind user not found' });
  }

  res.json({
    ...wind,
    content: decrypt(wind.content),
    username: decrypt(windUser.username),
    displayName: decrypt(windUser.displayName || windUser.username),
    badge: windUser.badge ? decrypt(windUser.badge) : '',
    isLiked: wind.likes.includes(req.user.id)
  });
});

router.get('/:id/replies', auth, (req, res) => {
  const winds = Wind.getAllWinds();
  const wind = winds.find(w => w.id === req.params.id);
  
  if (!wind) {
    return res.status(404).json({ error: 'Wind not found' });
  }

  const users = User.getAllUsers();
  const replies = wind.replies.map(reply => {
    const replyUser = users.find(u => u.username === reply.userId);
    if (!replyUser) {
      return {
        ...reply,
        content: decrypt(reply.content),
        username: 'deleted_user',
        displayName: 'Deleted User',
        badge: '',
        isLiked: reply.likes?.includes(req.user.id) || false
      };
    }
    
    return {
      ...reply,
      content: decrypt(reply.content),
      username: decrypt(replyUser.username),
      displayName: decrypt(replyUser.displayName || replyUser.username),
      badge: replyUser.badge ? decrypt(replyUser.badge) : '',
      isLiked: reply.likes?.includes(req.user.id) || false
    };
  });

  res.json(replies);
});

router.post('/:windId/replies/:replyId/like', auth, (req, res) => {
  const reply = Wind.likeReply(req.params.windId, req.params.replyId, req.user.id);
  if (!reply) {
    return res.status(404).json({ error: 'Reply not found' });
  }
  res.json(reply);
});

router.delete('/:windId/replies/:replyId', auth, (req, res) => {
  try {
    const { windId, replyId } = req.params;
    const winds = Wind.getAllWinds();
    const wind = winds.find(w => w.id === windId);
    
    if (!wind) {
      return res.status(404).json({ error: 'Wind not found' });
    }
    
    const replyIndex = wind.replies.findIndex(reply => reply.id === replyId);
    if (replyIndex === -1) {
      return res.status(404).json({ error: 'Reply not found' });
    }
    
    // Check if the user is the owner of the reply
    if (wind.replies[replyIndex].userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this reply' });
    }
    
    wind.replies.splice(replyIndex, 1);
    Wind.saveWinds(winds);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;