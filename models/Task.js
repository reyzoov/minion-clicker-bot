const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['channel', 'daily', 'one-time'], 
    default: 'channel' 
  },
  channelLink: { type: String, default: '' },
  channelId: { type: String, default: '' },
  reward: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);