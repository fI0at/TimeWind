const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('../encryption/crypto');
const { ADMIN_PASSWORD, SALT_ROUNDS } = require('../config/config');

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
      
      //this.createAdminAccount();
    }

    if (!fs.existsSync(this.profilesPath)) {
      fs.mkdirSync(this.profilesPath, { recursive: true });
    }
  }

  async createAdminAccount() {
    const adminExists = this.getAllUsers().find(u => decrypt(u.username) === 'admin');
    if (!adminExists) {
      const adminPassword = ADMIN_PASSWORD;
      await this.createUser('admin', 'admin@timewind.local', adminPassword, '127.0.0.1');
      const users = this.getAllUsers();
      const admin = users.find(u => decrypt(u.username) === 'admin');
      admin.displayName = encrypt('Admin');
      admin.badge = encrypt('Administrator');
      admin.bio = encrypt('<span style="font-size: 32px;">System Administrator</span><br>Automatically generated account.');
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

  validateUsername(username) {
    if (username.length < 3 || username.length > 16) {
      throw new Error('Username must be between 3 and 16 characters');
    }

    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, dots and underscores');
    }

    if (username.toLowerCase() === 'null' || 
        username.toLowerCase() === 'undefined' || 
        username.toLowerCase() === 'deleted_user' ||
        username.toLowerCase() === 'administrator' ||
        username.toLowerCase() === 'system') {
      throw new Error('This username is not allowed');
    }
  }

  async createUser(username, email, password, ip) {
    const users = this.getAllUsers();
    username = username.toLowerCase();
    
    this.validateUsername(username);

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
      created: new Date().toISOString(),
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
      if (newDisplayName.length > 50) {
        throw new Error('Display name cannot exceed 50 characters');
      }
      const sanitizedDisplayName = username === 'admin' ? newDisplayName : newDisplayName.replace(/<[^>]*>/g, '');
      user.displayName = encrypt(sanitizedDisplayName);
    }

    if (newBio !== undefined) {
      if (newBio.length > 160) {
        throw new Error('Bio cannot exceed 160 characters');
      }
      const sanitizedBio = username === 'admin' ? newBio : newBio.replace(/<[^>]*>/g, '');
      user.bio = encrypt(sanitizedBio);
    }

    if (newUsername && newUsername !== username) {
      newUsername = newUsername.toLowerCase();
      
      this.validateUsername(newUsername);
      
      if (users.find(u => decrypt(u.username) === newUsername)) {
        throw new Error('Username already taken');
      }

      if (decrypt(user.badge) === 'Administrator' && newUsername !== 'admin') {
        throw new Error('Administrator cannot change their username');
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

    if (!user.following.includes(target.username)) {
      user.following.push(target.username);
      target.followers.push(user.username);
      this.saveUsers(users);
    }
    return { success: true };
  }

  unfollowUser(username, targetUsername) {
    const users = this.getAllUsers();
    const user = users.find(u => decrypt(u.username) === username);
    const target = users.find(u => decrypt(u.username) === targetUsername);

    if (!user || !target) {
      throw new Error('User not found');
    }

    user.following = user.following.filter(u => u !== target.username);
    target.followers = target.followers.filter(u => u !== user.username);
    this.saveUsers(users);
    return { success: true };
  }

  updateUserBadges(username, badges) {
    const users = this.getAllUsers();
    const user = users.find(u => decrypt(u.username) === username);
    if (!user) throw new Error('User not found');
    
    if (user.badge && decrypt(user.badge).toLowerCase() === 'administrator') {
      user.badges = ['administrator'];
      this.saveUsers(users);
      return user;
    }
    
    user.badges = badges;
    this.saveUsers(users);
    return user;
  }

  updateUserLocation(username, location) {
    const users = this.getAllUsers();
    const user = users.find(u => decrypt(u.username) === username);
    
    if (!user) {
      throw new Error('User not found');
    }

    user.location = location ? encrypt(JSON.stringify(location)) : null;
    
    const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
    data.users = users;
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    
    return user;
  }
}

module.exports = new User();