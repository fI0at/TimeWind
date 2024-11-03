const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const windRoutes = require('./routes/windRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ipDetection = require('./middleware/ipDetection');

const app = express();
const PORT = process.env.PORT || 3000;

const fs = require('fs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/:name', (req, res) => {
  const name = req.params.name;
  if (name === 'favicon.ico') return;
  const filePath = path.join(__dirname, `../public/${name}.html`);

  try {
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      console.log(filePath);
      res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
    }
  } catch (err) {
    console.error(err);
    res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
  }
});

app.use(ipDetection);
app.use(bodyParser.json());

app.use('/api/auth', authRoutes);
app.use('/api/winds', windRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes); 

process.title = "Twitter Clone";
process.stdout.write('\u001B]0;Twitter Clone\u0007');
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

User.createAdminAccount().catch(err => {
  console.error('Error creating admin account:', err);
});