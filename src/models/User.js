const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('../encryption/crypto');
const { SALT_ROUNDS } = require('../config/config');

class User {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/db.json');
    this.profilesPath = path.join(__dirname, '../data/profiles');
    this.defaultProfilePath = path.join(__dirname, '../../public/img/default-profile.png');
    this.geoip = require('geoip-lite');
    
    if (!fs.existsSync(path.dirname(this.dbPath))) {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }
    
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify({
        users: [],
        winds: []
      }, null, 2));
      
      this.createAdminAccount();
    }

    if (!fs.existsSync(this.profilesPath)) {
      fs.mkdirSync(this.profilesPath, { recursive: true });
    }
  }

  async createAdminAccount() {
    const adminExists = this.getAllUsers().find(u => decrypt(u.username) === 'admin');
    if (!adminExists) {
      await this.createUser('admin', 'admin@timewind.local', 'admin', '127.0.0.1');
      const users = this.getAllUsers();
      const admin = users.find(u => decrypt(u.username) === 'admin');
      admin.displayName = encrypt('Administrator');
      admin.badge = 'administrator';
      this.saveUsers(users);
    }
  }

  getAllUsers() {
    try {
      return JSON.parse(fs.readFileSync(this.dbPath, 'utf8')).users;
    } catch {
      return [];
    }
  }

  saveUsers(users) {
    const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8') || '{}');
    data.users = users;
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
  }

  async createUser(username, email, password, ip) {
    const users = this.getAllUsers();
    username = username.toLowerCase();
    
    if (users.find(u => decrypt(u.username) === username)) {
      throw new Error('Username already exists');
    }

    if (users.find(u => decrypt(u.email) === email.toLowerCase())) {
      throw new Error('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = {
      username: encrypt(username),
      displayName: encrypt(username),
      bio: encrypt(''),
      email: encrypt(email.toLowerCase()),
      password: hashedPassword,
      location: null,
      following: [],
      followers: [],
      created: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  async updateProfile(username, newUsername, newDisplayName, newBio, profilePicture) {
    const users = this.getAllUsers();
    const user = users.find(u => decrypt(u.username) === username);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (newDisplayName) {
      user.displayName = encrypt(newDisplayName);
    }

    if (newBio !== undefined) {
      user.bio = encrypt(newBio);
    }

    if (newUsername && newUsername !== username) {
      newUsername = newUsername.toLowerCase();
      
      if (!/^[a-zA-Z0-9._]+$/.test(newUsername)) {
        throw new Error('Username can only contain letters, numbers, dots and underscores');
      }
      
      if (users.find(u => decrypt(u.username) === newUsername)) {
        throw new Error('Username already taken');
      }
      
      const oldEncryptedUsername = user.username;
      user.username = encrypt(newUsername);
      
      const oldProfilePath = path.join(this.profilesPath, `${oldEncryptedUsername}.bin`);
      const newProfilePath = path.join(this.profilesPath, `${user.username}.bin`);
      
      if (fs.existsSync(oldProfilePath)) {
        await fs.promises.rename(oldProfilePath, newProfilePath);
      }

      const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      if (data.winds) {
        data.winds = data.winds.map(wind => {
          if (wind.userId === oldEncryptedUsername) {
            wind.userId = user.username;
          }
          return wind;
        });
        fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
      }
    }

    if (profilePicture) {
      await fs.promises.writeFile(
        path.join(this.profilesPath, `${user.username}.bin`),
        encrypt(profilePicture.toString('base64'))
      );
    }

    this.saveUsers(users);
    return user;
  }

  async getProfilePicture(username) {
    const users = this.getAllUsers();
    const user = users.find(u => decrypt(u.username) === username);
    
    if (!user) {
      throw new Error('User not found');
    }

    try {
      const profilePath = path.join(this.profilesPath, `${user.username}.bin`);
      const encryptedImage = await fs.promises.readFile(profilePath, 'utf8');
      return Buffer.from(decrypt(encryptedImage), 'base64');
    } catch {
      return await fs.promises.readFile(this.defaultProfilePath);
    }
  }

  followUser(username, targetUsername) {
    const users = this.getAllUsers();
    const user = users.find(u => decrypt(u.username) === username);
    const target = users.find(u => decrypt(u.username) === targetUsername);

    if (!user || !target) {
      throw new Error('User not found');
    }

    const encryptedUsername = user.username;
    const encryptedTargetUsername = target.username;

    if (!user.following.includes(encryptedTargetUsername)) {
      user.following.push(encryptedTargetUsername);
      target.followers.push(encryptedUsername);
    }

    this.saveUsers(users);
    return { success: true };
  }

  unfollowUser(username, targetUsername) {
    const users = this.getAllUsers();
    const user = users.find(u => decrypt(u.username) === username);
    const target = users.find(u => decrypt(u.username) === targetUsername);

    if (!user || !target) {
      throw new Error('User not found');
    }

    const encryptedUsername = user.username;
    const encryptedTargetUsername = target.username;

    user.following = user.following.filter(u => u !== encryptedTargetUsername);
    target.followers = target.followers.filter(u => u !== encryptedUsername);

    this.saveUsers(users);
    return { success: true };
  }

  updateUserBadges(username, badges) {
    const users = this.getAllUsers();
    const user = users.find(u => decrypt(u.username) === username);
    if (!user) throw new Error('User not found');
    
    if (decrypt(user.username) === 'admin') {
      user.badges = ['administrator'];
      this.saveUsers(users);
      return user;
    }
    
    user.badges = badges;
    this.saveUsers(users);
    return user;
  }
}

module.exports = new User();