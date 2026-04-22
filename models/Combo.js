const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  cardIds: [{ type: String, required: true }],
  bonusMultiplier: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Combo', comboSchema);