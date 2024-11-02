const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../encryption/crypto');

class Wind {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/db.json');
  }

  createWind(userId, content, userLocation) {
    const winds = this.getAllWinds();
    const newWind = {
      id: Date.now().toString(),
      userId,
      content: encrypt(content),
      location: userLocation ? encrypt(JSON.stringify(userLocation)) : null,
      likes: [],
      replies: [],
      timestamp: new Date().toISOString(),
      username: userId
    };
    winds.push(newWind);
    this.saveWinds(winds);
    return newWind;
  }

  likeWind(windId, userId) {
    const winds = this.getAllWinds();
    const wind = winds.find(t => t.id === windId);
    if (!wind) return null;
    
    const likeIndex = wind.likes.indexOf(userId);
    if (likeIndex === -1) {
        wind.likes.push(userId);
    } else {
        wind.likes.splice(likeIndex, 1);
    }
    this.saveWinds(winds);
    return wind;
  }

  replyToWind(windId, userId, content) {
    const winds = this.getAllWinds();
    const wind = winds.find(t => t.id === windId);
    const reply = {
      id: Date.now().toString(),
      userId,
      content: encrypt(content),
      timestamp: new Date().toISOString(),
      username: userId
    };
    wind.replies.push(reply);
    this.saveWinds(winds);
    return reply;
  }

  getAllWinds() {
    try {
      const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      const winds = data.winds || [];
      return winds.map(wind => ({
        ...wind,
        username: wind.userId
      }));
    } catch {
      return [];
    }
  }

  saveWinds(winds) {
    const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8') || '{}');
    data.winds = winds;
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
  }

  deleteWind(windId) {
    const winds = this.getAllWinds();
    const updatedWinds = winds.filter(t => t.id !== windId);
    this.saveWinds(updatedWinds);
    return true;
  }
}

module.exports = new Wind();