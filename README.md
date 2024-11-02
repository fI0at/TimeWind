# Timewind

A Twitter clone built in 3 hours as a joke. Features encrypted data storage, real-time feed updates, and a basic recommendation algorithm.

## Features

- User authentication with JWT
- Encrypted data storage for posts ("winds") and user information
- Profile customization with image upload
- Like and delete posts
- Feed algorithm based on:
  - Time decay
  - User relationships (following)
  - Like counts
  - Geographic proximity
- Responsive design

## Tech Stack

- Frontend: Vanilla JavaScript, HTML, CSS
- Backend: Node.js, Express
- Storage: File-based JSON database
- Security: bcrypt, JWT, AES-256 encryption

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or use the included batch file:
```bash
run.bat
```

The application will be available at `http://localhost:3000`

## Security Note

This project uses hardcoded encryption keys (see `src/encryption/crypto.js`). For any real-world use, you should:
- Use environment variables for encryption keys
- Implement proper session management
- Use a real database
- Add input validation
- Add rate limiting

## Project Structure

```
timewind/
├── public/           # Static files
│   ├── css/         # Stylesheets
│   ├── js/          # Frontend JavaScript
│   └── img/         # Images
├── src/
│   ├── data/        # JSON database and profile pictures
│   ├── models/      # Data models
│   ├── routes/      # API routes
│   ├── services/    # Business logic
│   └── server.js    # Entry point
```

## Known Limitations

- No proper database (uses JSON files)
- Basic error handling
- No input validation
- No rate limiting
- Hardcoded encryption keys
- No proper session management
- No test coverage

## Why?

Because sometimes the best way to learn is to build something ridiculous under arbitrary constraints. This project was created in 3 hours as a joke, but it demonstrates basic concepts of:

- Authentication
- Encryption
- File handling
- REST APIs
- Frontend/Backend integration
- Basic recommendation algorithms

## License

This is a joke project. Do whatever you want with it, but probably don't use it in production.
