const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const User = require('../models/User');
const Task = require('../models/Task');
const PromoCode = require('../models/PromoCode');
const { clickLimiter } = require('../middleware/rateLimit');
const constants = require('../config/constants');

// ========== ИНИЦИАЛИЗАЦИЯ ==========
router.post('/init', async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, photoUrl, referredBy } = req.body;
    
    let user = await User.findOne({ where: { telegramId } });
    
    if (!user) {
      user = await User.create({
        telegramId,
        username: username || '',
        firstName: firstName || '',
        lastName: lastName || '',
        photoUrl: photoUrl || ''
      });
      
      // Реферальная система
      if (referredBy && referredBy !== telegramId) {
        const referrer = await User.findOne({ where: { telegramId: referredBy } });
        if (referrer) {
          const reward = parseInt(process.env.REFERRAL_REWARD) || 5000;
          referrer.bananas += reward;
          referrer.totalEarned += reward;
          referrer.referralCount += 1;
          referrer.referrals = [...referrer.referrals, telegramId];
          referrer.referralBonus += constants.REFERRAL_BONUS_PERCENT;
          await referrer.save();
          
          user.bananas += Math.floor(reward / 2);
          await user.save();
        }
      }
    } else {
      // Офлайн доход
      const secondsOffline = Math.floor((Date.now() - new Date(user.lastOnline).getTime()) / 1000);
      const passiveIncome = user.upgrades.autoClicker * 0.5 + user.upgrades.bananaFarm * 1;
      const offlineEarnings = Math.min(secondsOffline, constants.OFFLINE_MAX_HOURS * 3600) * passiveIncome;
      
      if (offlineEarnings > 0) {
        user.bananas += offlineEarnings;
        user.totalEarned += offlineEarnings;
      }
      
      user.regenEnergy();
      user.lastOnline = new Date();
      user.username = username || user.username;
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      if (photoUrl) user.photoUrl = photoUrl;
      await user.save();
    }
    
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ========== КЛИК ==========
router.post('/click', clickLimiter, async (req, res) => {
  try {
    const { telegramId } = req.body;
    let user = await User.findOne({ where: { telegramId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.regenEnergy();
    
    if (user.energy < constants.ENERGY_PER_CLICK) {
      await user.save();
      return res.json({
        success: false,
        error: 'Not enough energy!',
        energy: user.energy,
        maxEnergy: user.maxEnergy
      });
    }
    
    let reward = 1 + (user.upgrades.clickPower || 0);
    
    const critChance = (user.upgrades.critical || 0) * 3;
    const isCritical = Math.random() * 100 < critChance;
    if (isCritical) reward *= 5;
    
    if (user.prestige > 0) reward *= Math.pow(2, user.prestige);
    
    user.energy -= constants.ENERGY_PER_CLICK;
    user.bananas += reward;
    user.totalEarned += reward;
    const leveledUp = user.updateLevel();
    
    await user.save();
    
    res.json({
      success: true,
      reward,
      isCritical,
      balance: user.bananas,
      energy: user.energy,
      maxEnergy: user.maxEnergy,
      level: user.level,
      leveledUp
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ПОЛУЧИТЬ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ==========
router.get('/user/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ where: { telegramId: req.params.telegramId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.regenEnergy();
    await user.save();
    
    const passiveIncome = (user.upgrades.autoClicker || 0) * 0.5 + (user.upgrades.bananaFarm || 0) * 1;
    
    res.json({
      bananas: user.bananas,
      totalEarned: user.totalEarned,
      level: user.level,
      prestige: user.prestige,
      energy: user.energy,
      maxEnergy: user.maxEnergy,
      passiveIncome,
      upgrades: user.upgrades,
      cards: user.cards,
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralBonus: user.referralBonus,
      dailyBonusStreak: user.dailyBonusStreak,
      comboActive: user.comboActiveUntil && new Date() < new Date(user.comboActiveUntil)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ПОКУПКА УЛУЧШЕНИЯ ==========
router.post('/buy-upgrade', async (req, res) => {
  try {
    const { telegramId, upgradeId } = req.body;
    const user = await User.findOne({ where: { telegramId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const prices = {
      clickPower: 100,
      autoClicker: 500,
      energy: 300,
      energyRegen: 400,
      critical: 600,
      bananaFarm: 800,
      minionHelper: 1000
    };
    
    const currentLevel = user.upgrades[upgradeId] || 0;
    if (currentLevel >= 10) {
      return res.json({ success: false, message: 'Max level reached!' });
    }
    
    let price = prices[upgradeId] * Math.pow(2, currentLevel);
    const discount = (user.upgrades.minionHelper || 0) * 2;
    price = Math.floor(price * (1 - discount / 100));
    
    if (user.bananas < price) {
      return res.json({ success: false, message: `Need ${price} bananas!` });
    }
    
    user.bananas -= price;
    user.upgrades[upgradeId] = currentLevel + 1;
    
    if (upgradeId === 'energy') {
      user.maxEnergy = 500 + (user.upgrades.energy * 10);
    }
    
    await user.save();
    
    res.json({
      success: true,
      newLevel: currentLevel + 1,
      balance: user.bananas,
      maxEnergy: user.maxEnergy
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== РЕФЕРАЛЬНАЯ ССЫЛКА ==========
router.get('/referral/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ where: { telegramId: req.params.telegramId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const botUsername = process.env.BOT_USERNAME;
    const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;
    
    res.json({ referralLink, referralCount: user.referralCount, referralBonus: user.referralBonus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ЕЖЕДНЕВНЫЙ БОНУС ==========
router.post('/daily-bonus', async (req, res) => {
  try {
    const { telegramId } = req.body;
    const user = await User.findOne({ where: { telegramId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const now = new Date();
    const lastBonus = user.lastDailyBonus;
    const bonuses = process.env.DAILY_BONUSES.split(',').map(Number);
    
    if (lastBonus && now - new Date(lastBonus) < 24 * 60 * 60 * 1000) {
      const hoursLeft = 24 - Math.floor((now - new Date(lastBonus)) / (60 * 60 * 1000));
      return res.json({ success: false, message: `Next bonus in ${hoursLeft} hours` });
    }
    
    let streak = user.dailyBonusStreak;
    if (lastBonus && now - new Date(lastBonus) < 48 * 60 * 60 * 1000) {
      streak = Math.min(streak + 1, 6);
    } else {
      streak = 0;
    }
    
    const reward = bonuses[streak];
    user.bananas += reward;
    user.totalEarned += reward;
    user.dailyBonusStreak = streak;
    user.lastDailyBonus = now;
    await user.save();
    
    res.json({
      success: true,
      reward,
      streak: streak + 1,
      nextBonus: bonuses[streak + 1] || bonuses[6]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ТАБЛИЦА ЛИДЕРОВ ==========
router.get('/leaderboard', async (req, res) => {
  try {
    const leaders = await User.findAll({
      order: [['totalEarned', 'DESC']],
      limit: 100,
      attributes: ['firstName', 'username', 'photoUrl', 'totalEarned', 'level', 'prestige', 'referralCount']
    });
    res.json(leaders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ЗАДАНИЯ ==========
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.findAll({ where: { isActive: true }, order: [['order', 'ASC']] });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-task', async (req, res) => {
  try {
    const { telegramId, taskId } = req.body;
    const user = await User.findOne({ where: { telegramId } });
    const task = await Task.findOne({ where: { id: taskId } });
    
    if (!user || !task) return res.status(404).json({ error: 'Not found' });
    if (user.completedTasks.includes(taskId)) {
      return res.json({ success: false, message: 'Already completed!' });
    }
    
    if (process.env.NODE_ENV === 'development') {
      user.bananas += task.reward;
      user.totalEarned += task.reward;
      user.completedTasks = [...user.completedTasks, taskId];
      await user.save();
      return res.json({ success: true, reward: task.reward, balance: user.bananas });
    }
    
    res.json({ success: false, message: 'Complete the task first!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ПРОМОКОДЫ ==========
router.post('/activate-promo', async (req, res) => {
  try {
    const { telegramId, code } = req.body;
    const user = await User.findOne({ where: { telegramId } });
    const promo = await PromoCode.findOne({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });
    
    if (!user || !promo) return res.json({ success: false, message: 'Invalid promo code!' });
    if (user.usedPromoCodes.includes(promo.code)) {
      return res.json({ success: false, message: 'Already used!' });
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return res.json({ success: false, message: 'Promo code expired!' });
    }
    
    user.bananas += promo.reward;
    user.totalEarned += promo.reward;
    user.usedPromoCodes = [...user.usedPromoCodes, promo.code];
    promo.usedCount += 1;
    await user.save();
    await promo.save();
    
    res.json({ success: true, reward: promo.reward, balance: user.bananas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;