const rateLimit = require('express-rate-limit');

const clickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many clicks! Slow down.' },
  skipSuccessfulRequests: true
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests! Try again later.' }
});

module.exports = { clickLimiter, apiLimiter };