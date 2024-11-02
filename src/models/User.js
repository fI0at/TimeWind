const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('../encryption/crypto');
const { SALT_ROUNDS } = require('../config/config');

class User {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/db.json');
    this.profilesPath = path.join(__dirname, '../data/profiles');
    this.defaultProfilePath = path.join(__dirname, '../data/profiles/default.png');
    this.geoip = require('geoip-lite');
    
    if (!fs.existsSync(path.dirname(this.dbPath))) {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }
    
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify({
        users: [],
        winds: []
      }, null, 2));
    }

    if (!fs.existsSync(this.profilesPath)) {
      fs.mkdirSync(this.profilesPath, { recursive: true });
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
    
    if (users.find(u => decrypt(u.username) === username)) {
      throw new Error('Username already exists');
    }
    
    const defaultImage = await fs.promises.readFile(this.defaultProfilePath);
    const encryptedUsername = encrypt(username);
    await fs.promises.writeFile(
      path.join(this.profilesPath, `${encryptedUsername}.bin`),
      encrypt(defaultImage.toString('base64'))
    );

    const location = this.geoip.lookup(ip);
    const encryptedLocation = location ? encrypt(JSON.stringify({
      lat: location.ll[0],
      lon: location.ll[1]
    })) : null;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = {
        username: encrypt(username),
        displayName: encrypt(username),
        bio: encrypt(''),
        email: encrypt(email),
        password: hashedPassword,
        location: encryptedLocation,
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

    if (!user.following.includes(targetUsername)) {
      user.following.push(targetUsername);
      target.followers.push(username);
    }

    this.saveUsers(users);
    return user;
  }
}

module.exports = new User();