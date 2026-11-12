// Resets the database to a known set of sample data for testing and demos.
// Run with: npm run seed
// WARNING: deletes every author and book in the database named by MONGO_URI.
require('dotenv').config();
const mongoose = require('mongoose');
const Author = require('./models/Author');
const Book = require('./models/Book');

const authors = [
  { name: 'Chinua Achebe', country: 'Nigeria', bio: 'Novelist and poet, author of the African Trilogy.' },
  { name: 'Chimamanda Ngozi Adichie', country: 'Nigeria', bio: 'Novelist and essayist.' },
  { name: 'Mara Quinn', country: 'Ireland', bio: 'Thriller writer (sample author).' },
  // No books on purpose: shows the empty stats response and a delete that
  // the delete policy allows
  { name: 'Tsitsi Dangarembga', country: 'Zimbabwe', bio: 'Novelist and filmmaker.' },
];

// author is the index into the authors array above
const books = [
  { title: 'Things Fall Apart', genre: 'Literary Fiction', price: 12.99, publishedYear: 1958, author: 0 },
  { title: 'No Longer at Ease', genre: 'Literary Fiction', price: 10.5, publishedYear: 1960, author: 0 },
  { title: 'Arrow of God', genre: 'Historical Fiction', price: 14.0, publishedYear: 1964, author: 0 },
  { title: 'Anthills of the Savannah', genre: 'Literary Fiction', price: 21.5, publishedYear: 1987, author: 0 },
  { title: 'Purple Hibiscus', genre: 'Literary Fiction', price: 11.99, publishedYear: 2003, author: 1 },
  { title: 'Half of a Yellow Sun', genre: 'Historical Fiction', price: 16.5, publishedYear: 2006, author: 1 },
  { title: 'Americanah', genre: 'Literary Fiction', price: 18.0, publishedYear: 2013, author: 1 },
  { title: 'The Silent Sea', genre: 'Thriller', price: 24.99, publishedYear: 2021, author: 2 },
  { title: 'Sea of Glass', genre: 'Thriller', price: 14.5, publishedYear: 2018, author: 2 },
  { title: 'Deep Sea Echo', genre: 'Thriller', price: 35.0, publishedYear: 2023, author: 2 },
  { title: 'Night Train to Lisbon', genre: 'Thriller', price: 9.99, publishedYear: 2015, author: 2 },
];

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Seeding ${mongoose.connection.name}...`);

  await Book.deleteMany({});
  await Author.deleteMany({});

  const createdAuthors = await Author.create(authors);
  await Book.create(books.map((book) => ({ ...book, author: createdAuthors[book.author]._id })));

  console.log(`Inserted ${createdAuthors.length} authors and ${books.length} books`);
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
