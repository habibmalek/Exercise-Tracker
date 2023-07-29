const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// Schemas
const userSchema = mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = mongoose.Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Config
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('DB Connected Successfully');
}).catch((err) => {
  console.error('Error connecting to the database:', err.message);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Helper function for error handling
function handleErrors(res, status, message) {
  return res.status(status).json({ error: message });
}

// API Endpoints
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return handleErrors(res, 409, 'User already exists!');
    }

    const user = await User.create({ username });
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err.message);
    handleErrors(res, 500, 'Internal server error');
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userId = req.params._id;
    const foundUser = await User.findById(userId);

    if (!foundUser) {
      return handleErrors(res, 404, 'User not found');
    }

    const exercise = await Exercise.create({
      username: foundUser.username,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json({
      username: exercise.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(), // Convert the date to a string using toDateString()
      _id: userId,
    });
  } catch (err) {
    console.error('Error creating exercise:', err.message);
    handleErrors(res, 500, 'Internal server error');
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const userId = req.params._id;
    const foundUser = await User.findById(userId);

    if (!foundUser) {
      return handleErrors(res, 404, 'User not found');
    }

    const filter = { username: foundUser.username };
    const dateFilter = {};

    if (from) {
      dateFilter['$gte'] = new Date(from);
    }
    if (to) {
      dateFilter['$lte'] = new Date(to);
    }

    if (from || to) {
      filter.date = dateFilter;
    }

    const exercises = await Exercise.find(filter)
      .limit(parseInt(limit) || 100)
      .select('description duration date -_id');

    const logs = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(), // Convert the date to a string using toDateString()
    }));

    res.json({
      username: foundUser.username,
      count: exercises.length,
      _id: userId,
      log: logs,
    });
  } catch (err) {
    console.error('Error fetching logs:', err.message);
    handleErrors(res, 500, 'Internal server error');
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    handleErrors(res, 500, 'Internal server error');
  }
});

// Listening
const PORT = process.env.PORT || 3000;
const listener = app.listen(PORT, () => {
  console.log('Your app is listening on port ' + PORT);
});