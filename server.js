require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const authorRoutes = require('./routes/authorRoutes');
const bookRoutes = require('./routes/bookRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const { MONGO_URI } = process.env;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'ReadMore API is running' });
});

app.use('/authors', authorRoutes);
app.use('/books', bookRoutes);

// Must come after the routes: unknown URLs, then any error thrown above
app.use(notFound);
app.use(errorHandler);

async function start() {
  if (!MONGO_URI) {
    console.error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start();
