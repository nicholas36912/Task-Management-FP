const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// MongoDB and Mongoose setup
mongoose.connect('mongodb+srv://your_username:your_password@cluster0.aimnqq7.mongodb.net/your_database', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Mongoose Schema and Model for User
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  roles: { type: [String], default: ['user'] },
});

const User = mongoose.model('User', userSchema);

// Passport middleware setup
app.use(passport.initialize());

// Passport JWT strategy setup
const JWTStrategy = passportJWT.Strategy;
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: req => req.headers.authorization?.split(' ')[1],
      secretOrKey: 'your_secret_key', // placeholder value
    },
    (payload, done) => {
      // Check user in the database based on payload sub
      User.findById(payload.sub)
        .then(user => {
          if (user) {
            done(null, user);
          } else {
            done(null, false);
          }
        })
        .catch(err => done(err, false));
    }
  )
);

// Google OAuth setup
passport.use(
  new GoogleStrategy(
    {
      clientID: 'your_google_client_id', // placeholder value
      clientSecret: 'your_google_client_secret', // placeholder value
      callbackURL: 'http://localhost:3000/auth/google/callback', 
    },
    (accessToken, refreshToken, profile, done) => {
      // Check user in the database based on profile.id or create a new user
      User.findOne({ googleId: profile.id })
        .then(existingUser => {
          if (existingUser) {
            done(null, existingUser);
          } else {
            const newUser = new User({
              googleId: profile.id,
              roles: ['user'], // Default role for new users
            });
            newUser.save()
              .then(savedUser => done(null, savedUser))
              .catch(err => done(err, false));
          }
        })
        .catch(err => done(err, false));
    }
  )
);

// CRUD Routes
app.get('/tasks', async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

app.post('/tasks', passport.authenticate('jwt', { session: false }), [
  body('title').isLength({ min: 1 }),
  body('description').isLength({ min: 1 }),
  body('priority').isLength({ min: 1 }),
  body('status').isLength({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const newTask = new Task(req.body);
  await newTask.save();
  res.json(newTask);
});

// Registration Route
app.post('/register', [
  body('username').isLength({ min: 1 }),
  body('password').isLength({ min: 6 }), // You may want to adjust the minimum length
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Authentication Routes
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  User.findOne({ username, password })
    .then(user => {
      if (user) {
        const token = jwt.sign({ sub: user._id, roles: user.roles }, 'your_secret_key', { expiresIn: '1h' });
        res.json({ token });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    })
    .catch(err => res.status(500).json({ error: 'Internal Server Error' }));
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  // Redirect or respond as needed after successful Google OAuth login
  res.redirect('/dashboard');
});

// Helper function to check roles
const checkRoles = (user, requiredRoles, done) => {
  if (!user || !requiredRoles.every(role => user.roles.includes(role))) {
    return done(null, false); // User does not have required roles
  }
  return done(null, user);
};

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
