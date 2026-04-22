const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Card = require('../models/Card');
const Task = require('../models/Task');
const PromoCode = require('../models/PromoCode');
const Combo = require('../models/Combo');
const { authAdmin } = require('../middleware/auth');

// ========== СТАТИСТИКА ==========
router.get('/stats', authAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBananas = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$totalEarned' } } }
    ]);
    const activeUsers = await User.countDocuments({ 
      lastOnline: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });
    const totalReferrals = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$referralCount' } } }
    ]);
    
    res.json({
      totalUsers,
      totalBananas: totalBananas[0]?.total || 0,
      activeUsers,
      totalReferrals: totalReferrals[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== УПРАВЛЕНИЕ КАРТОЧКАМИ ==========
router.get('/cards', authAdmin, async (req, res) => {
  try {
    const cards = await Card.find().sort({ order: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-card', authAdmin, async (req, res) => {
  try {
    const { cardId, name, description, icon, basePrice, priceMultiplier, profitPerHour, maxLevel, order } = req.body;
    const card = new Card({ cardId, name, description, icon, basePrice, priceMultiplier, profitPerHour, maxLevel, order });
    await card.save();
    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/update-card/:cardId', authAdmin, async (req, res) => {
  try {
    const card = await Card.findOneAndUpdate({ cardId: req.params.cardId }, req.body, { new: true });
    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete-card/:cardId', authAdmin, async (req, res) => {
  try {
    await Card.findOneAndDelete({ cardId: req.params.cardId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== УПРАВЛЕНИЕ ЗАДАНИЯМИ ==========
router.get('/tasks', authAdmin, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ order: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-task', authAdmin, async (req, res) => {
  try {
    const { title, description, type, channelLink, channelId, reward, isActive, order } = req.body;
    const task = new Task({ title, description, type, channelLink, channelId, reward, isActive, order });
    await task.save();
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/update-task/:id', authAdmin, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete-task/:id', authAdmin, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== УПРАВЛЕНИЕ ПРОМОКОДАМИ ==========
router.get('/promos', authAdmin, async (req, res) => {
  try {
    const promos = await PromoCode.find();
    res.json(promos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-promo', authAdmin, async (req, res) => {
  try {
    const { code, reward, maxUses, expiresAt } = req.body;
    const promo = new PromoCode({ code: code.toUpperCase(), reward, maxUses, expiresAt });
    await promo.save();
    res.json({ success: true, promo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete-promo/:code', authAdmin, async (req, res) => {
  try {
    await PromoCode.findOneAndDelete({ code: req.params.code.toUpperCase() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== УПРАВЛЕНИЕ КОМБО ==========
router.post('/create-combo', authAdmin, async (req, res) => {
  try {
    const { date, cardIds, bonusMultiplier } = req.body;
    const combo = new Combo({ date, cardIds, bonusMultiplier });
    await combo.save();
    res.json({ success: true, combo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ПОЛЬЗОВАТЕЛИ ==========
router.get('/users', authAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const users = await User.find()
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments();
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add-admin', authAdmin, async (req, res) => {
  try {
    const { telegramId } = req.body;
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.isAdmin = true;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== РАССЫЛКА ==========
router.post('/send-notification', authAdmin, async (req, res) => {
  try {
    const { message, userIds } = req.body;
    // Здесь можно реализовать рассылку через Telegram Bot API
    res.json({ success: true, message: `Notification would be sent to ${userIds?.length || 'all'} users` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;