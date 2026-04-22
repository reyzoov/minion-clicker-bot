const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const User = require('../models/User');
const Task = require('../models/Task');
const PromoCode = require('../models/PromoCode');
const { authAdmin } = require('../middleware/auth');

// ========== СТАТИСТИКА ==========
router.get('/stats', authAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalBananas = await User.sum('totalEarned');
    const activeUsers = await User.count({
      where: {
        lastOnline: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
    const totalReferrals = await User.sum('referralCount');
    
    res.json({ totalUsers, totalBananas, activeUsers, totalReferrals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== УПРАВЛЕНИЕ ЗАДАНИЯМИ ==========
router.get('/tasks', authAdmin, async (req, res) => {
  try {
    const tasks = await Task.findAll({ order: [['order', 'ASC']] });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-task', authAdmin, async (req, res) => {
  try {
    const { title, description, type, channelLink, channelId, reward, isActive, order } = req.body;
    const task = await Task.create({ title, description, type, channelLink, channelId, reward, isActive, order });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/update-task/:id', authAdmin, async (req, res) => {
  try {
    const task = await Task.update(req.body, { where: { id: req.params.id }, returning: true });
    res.json({ success: true, task: task[1][0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete-task/:id', authAdmin, async (req, res) => {
  try {
    await Task.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== УПРАВЛЕНИЕ ПРОМОКОДАМИ ==========
router.get('/promos', authAdmin, async (req, res) => {
  try {
    const promos = await PromoCode.findAll();
    res.json(promos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-promo', authAdmin, async (req, res) => {
  try {
    const { code, reward, maxUses, expiresAt } = req.body;
    const promo = await PromoCode.create({ code: code.toUpperCase(), reward, maxUses, expiresAt });
    res.json({ success: true, promo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete-promo/:code', authAdmin, async (req, res) => {
  try {
    await PromoCode.destroy({ where: { code: req.params.code.toUpperCase() } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ПОЛЬЗОВАТЕЛИ ==========
router.get('/users', authAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const { count, rows } = await User.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ users: rows, totalPages: Math.ceil(count / limit), currentPage: parseInt(page), total: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add-admin', authAdmin, async (req, res) => {
  try {
    const { telegramId } = req.body;
    const user = await User.findOne({ where: { telegramId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.isAdmin = true;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;