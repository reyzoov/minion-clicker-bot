const rateLimit = require('express-rate-limit');

// Лимит кликов: 300 в минуту
const clickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many clicks! Slow down.' },
  skipSuccessfulRequests: true
});

// Лимит API запросов: 100 в минуту
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests! Try again later.' }
});

module.exports = { clickLimiter, apiLimiter };