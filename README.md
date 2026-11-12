# ReadMore API

A REST API for a bookstore, built with **Express 5**, **MongoDB** and **Mongoose**. It manages two linked entities, **authors** and **books** (one author has many books), and enforces business rules that MongoDB doesn't enforce on its own.

The original assignment brief is in [ASSIGNMENT.md](ASSIGNMENT.md).

---

## Setup

**Requirements:** Node.js 18+, and MongoDB 5.2+ (local, Docker, or a free Atlas cluster).

```bash
npm install
cp .env.example .env    # then edit .env if needed
npm run seed            # optional: load sample data (wipes existing data!)
npm run dev             # start with auto-reload (or: npm start)
```

To run MongoDB locally with Docker:

```bash
docker run -d --name readmore-mongo -p 27017:27017 mongo:7
```

### Environment variables

| Variable    | Required | Example                                  | Notes |
|-------------|----------|------------------------------------------|-------|
| `MONGO_URI` | Yes      | `mongodb://127.0.0.1:27017/readmore`     | The server exits with an error if it's missing or the connection fails |
| `PORT`      | No       | `3000`                                   | Defaults to 3000 |

`.env` is git-ignored. Only `.env.example` is committed.

### Scripts

| Command        | What it does |
|----------------|--------------|
| `npm start`    | Start the server |
| `npm run dev`  | Start with nodemon (restarts on file changes) |
| `npm run seed` | **Deletes all authors and books**, then inserts 4 authors and 11 books. One author (Tsitsi Dangarembga) has no books on purpose, for the stats and delete demos |

### Trying the endpoints

[`requests.http`](requests.http) contains every endpoint and every error case, for the VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension. Run its requests top to bottom: later requests reuse ids captured from earlier ones.

---

## Project structure

```
server.js                    connect to MongoDB, then start listening
seed.js                      sample data (npm run seed)
requests.http                request collection
models/
  Author.js                  name (required), country, bio
  Book.js                    title, genre, price (required), publishedYear, author → Author (required)
routes/                      URL → controller wiring only
  authorRoutes.js
  bookRoutes.js
controllers/                 all request logic and status codes
  authorController.js
  bookController.js
middleware/
  validateObjectId.js        400 for malformed :id params
  errorHandler.js            404 for unknown routes + central error handler
utils/
  bookRules.js               price and year rules, regex escaping
  bookQuery.js               builds the GET /books filter, sort and pagination
```

---

## Endpoints

### Authors

| Method   | Path                 | Success | Errors |
|----------|----------------------|---------|--------|
| `POST`   | `/authors`           | 201     | 400 missing name |
| `GET`    | `/authors`           | 200     | |
| `GET`    | `/authors/:id`       | 200     | 400 bad id, 404 |
| `PUT`    | `/authors/:id`       | 200     | 400, 404 |
| `DELETE` | `/authors/:id`       | 200     | 400, 404, **409 author still has books** |
| `GET`    | `/authors/:id/books` | 200     | 400, 404 |
| `GET`    | `/authors/:id/stats` | 200     | 400, 404 |

### Books

| Method   | Path         | Success | Errors |
|----------|--------------|---------|--------|
| `POST`   | `/books`     | 201     | 400 invalid / unknown author, 409 duplicate title, 422 price/year |
| `GET`    | `/books`     | 200     | 400 invalid query param |
| `GET`    | `/books/:id` | 200     | 400, 404 |
| `PUT`    | `/books/:id` | 200     | 400, 404, 409, 422 |
| `DELETE` | `/books/:id` | 200     | 400, 404 |

`GET /books` and `GET /books/:id` return the **full author** (via `populate`), not just the id. `PUT` requests are partial: fields left out are not changed.

Example book body:

```json
{
  "title": "The Silent Sea",
  "genre": "Thriller",
  "price": 24.99,
  "publishedYear": 2021,
  "author": "<an existing author id>"
}
```

### `GET /books` query parameters

All optional, in any combination. Only the parameters present are applied, so with none you get every book.

| Param                 | Effect |
|-----------------------|--------|
| `genre`               | Exact genre, ignoring case (`thriller` matches `Thriller`) |
| `minPrice`/`maxPrice` | Price range; either, both or neither |
| `author`              | Only books by this author id |
| `search`              | Title contains this text, ignoring case |
| `sort`                | `price`, `title` (default) or `publishedYear` |
| `order`               | `asc` (default) or `desc` |
| `page`                | Page number, default 1 |
| `limit`               | Books per page, default 10, max 100 |

```
GET /books?genre=Thriller&minPrice=10&maxPrice=30&search=sea&sort=price&order=asc
```

The response is always paginated. `total` is the number of books matching the filter, not the whole collection:

```json
{ "page": 1, "limit": 10, "total": 2, "results": [ ... ] }
```

Invalid values (e.g. `minPrice=abc`, `sort=genre`, `page=0`) return 400 with a message. Unknown parameter names are ignored.

### `GET /authors/:id/stats`

```json
{
  "author": { "_id": "...", "name": "Chinua Achebe" },
  "bookCount": 4,
  "averagePrice": 14.75,
  "cheapestBook": { "_id": "...", "title": "No Longer at Ease", "price": 10.5 },
  "mostExpensiveBook": { "_id": "...", "title": "Anthills of the Savannah", "price": 21.5 }
}
```

`averagePrice` is rounded to 2 decimal places. An author with no books gets `bookCount: 0` and `null` for the other three fields.

---

## Business rules

| Rule | Status | Behaviour |
|------|--------|-----------|
| 1. No orphan books | 400 | A book's `author` must be an existing author, on create and when changed on update |
| 2. No duplicate titles per author | 409 | Case-insensitive and per author: two different authors may share a title |
| 3. Price and year | 422 | `price` must be greater than 0; `publishedYear` must be a whole number from 1450 to the current year |
| 4. Author delete policy | 409 | **Block:** an author who still has books can't be deleted; delete or reassign the books first |
| 5. Search and filter | 400 on bad params | See `GET /books` above |
| 6. Author stats | 404 unknown author | See `GET /authors/:id/stats` above |

Book checks run in this order, and the first failure is returned: **400** missing fields or wrong types → **422** price/year → **400** author exists → **409** duplicate title. The checks that need no database call run first.

**Why block deletes:** books carry catalogue and sales history. Cascading would destroy it, and reassigning would credit books to the wrong author. Blocking never loses data, and it needs no transaction because only one document is written. The downside is extra work for the client, who must remove every book first.

---

## Errors

Every error response has the same shape:

```json
{ "message": "Price must be greater than 0" }
```

| Status | When |
|--------|------|
| 400 | Malformed id, missing/invalid fields, invalid JSON body, unknown author, invalid query param |
| 404 | Unknown id, or a route that doesn't exist |
| 409 | Duplicate title for the author, or deleting an author who has books |
| 422 | Price or year outside the allowed range |
| 500 | Unexpected server error (details are logged, not sent to the client) |
