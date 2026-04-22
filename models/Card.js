const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  cardId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '🎴' },
  basePrice: { type: Number, required: true },
  priceMultiplier: { type: Number, default: 1.5 },
  profitPerHour: { type: Number, required: true },
  maxLevel: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
});

module.exports = mongoose.model('Card', cardSchema);