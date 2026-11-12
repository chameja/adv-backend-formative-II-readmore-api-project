// Catch-all for requests that matched no route. Mounted after every router.
const notFound = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
};

// Turns a Mongoose ValidationError into one readable line, e.g.
// "title is required; price must be a valid Number".
const describeValidationError = (err) =>
  Object.values(err.errors)
    .map((fieldError) =>
      fieldError.name === 'CastError'
        ? `${fieldError.path} must be a valid ${fieldError.kind}`
        : fieldError.message
    )
    .join('; ');

// Central error handler. Express 5 forwards anything thrown (or rejected) in
// a route handler here, so every error leaves the API as { message }.
// Four arguments are required for Express to treat this as an error handler.
const errorHandler = (err, req, res, next) => {
  // Body is not valid JSON (thrown by express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: describeValidationError(err) });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `${err.path} must be a valid ${err.kind}` });
  }

  // Our own errors (e.g. QueryError) and client errors from Express
  // middleware carry a 4xx status and a message safe to show
  const status = err.status ?? err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ message: err.message });
  }

  // Anything else is a bug or an outage: log the details, but don't leak
  // them to the client
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
};

module.exports = { notFound, errorHandler };
