// server.js
const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

// MongoDB and Mongoose setup
mongoose.connect('mongodb+srv://nicholasscinocco2:N36a912S@cluster0.aimnqq7.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true });
// Mongoose Schema and Model for Task
const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  priority: String,
  status: String,
});

const Task = mongoose.model('Task', taskSchema);

// CRUD Routes
app.get('/tasks', async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

app.post('/tasks', [
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

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
