const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Card = require('../models/Card');
const Task = require('../models/Task');
const PromoCode = require('../models/PromoCode');
const Combo = require('../models/Combo');
const { clickLimiter } = require('../middleware/rateLimit');
const { validateTelegramId } = require('../middleware/validation');
const { calculateUpgradePrice, calculatePassiveIncome } = require('../utils/calculations');
const constants = require('../config/constants');
const cardsConfig = require('../config/cards');

// ========== ИНИЦИАЛИЗАЦИЯ ==========
router.post('/init', validateTelegramId, async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, photoUrl, referredBy } = req.body;
    
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      // Создание нового пользователя
      user = new User({ 
        telegramId, 
        username: username || '', 
        firstName: firstName || '',
        lastName: lastName || '',
        photoUrl: photoUrl || ''
      });
      
      // Инициализация карточек (все на 0 уровне)
      const cards = await Card.find();
      cards.forEach(card => {
        user.cards.set(card.cardId, 0);
      });
      
      await user.save();
      
      // Реферальная система
      if (referredBy && referredBy !== telegramId) {
        const referrer = await User.findOne({ telegramId: referredBy });
        if (referrer) {
          const reward = parseInt(process.env.REFERRAL_REWARD) || 5000;
          referrer.bananas += reward;
          referrer.totalEarned += reward;
          referrer.referralCount += 1;
          referrer.referrals.push(telegramId);
          referrer.referralBonus += constants.REFERRAL_BONUS_PERCENT;
          await referrer.save();
          
          // Награда новому пользователю
          user.bananas += Math.floor(reward / 2);
          await user.save();
        }
      }
    } else {
      // Офлайн доход
      const secondsOffline = Math.floor((Date.now() - user.lastOnline) / 1000);
      const cards = await Card.find();
      const passiveIncome = calculatePassiveIncome(user, cards);
      const offlineEarnings = Math.min(secondsOffline, constants.OFFLINE_MAX_HOURS * 3600) * passiveIncome;
      
      if (offlineEarnings > 0) {
        user.bananas += offlineEarnings;
        user.totalEarned += offlineEarnings;
      }
      
      // Восстановление энергии
      user.regenEnergy();
      
      user.lastOnline = Date.now();
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
router.post('/click', clickLimiter, validateTelegramId, async (req, res) => {
  try {
    const { telegramId } = req.body;
    let user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Восстановление энергии
    user.regenEnergy();
    
    // Проверка энергии
    if (user.energy < constants.ENERGY_PER_CLICK) {
      await user.save();
      return res.json({ 
        success: false, 
        error: 'Not enough energy!', 
        energy: user.energy,
        maxEnergy: user.maxEnergy 
      });
    }
    
    // Расчёт награды
    let reward = 1 + user.upgrades.clickPower;
    
    // Критический удар
    const critChance = user.upgrades.critical * 3;
    const isCritical = Math.random() * 100 < critChance;
    if (isCritical) {
      reward *= 5;
    }
    
    // Бонус от уровня престижа
    if (user.prestige > 0) {
      reward *= Math.pow(2, user.prestige);
    }
    
    // Тратим энергию
    user.energy -= constants.ENERGY_PER_CLICK;
    user.bananas += reward;
    user.totalEarned += reward;
    
    // Обновление уровня
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
    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.regenEnergy();
    await user.save();
    
    const cards = await Card.find();
    const passiveIncome = calculatePassiveIncome(user, cards);
    
    res.json({
      bananas: user.bananas,
      totalEarned: user.totalEarned,
      level: user.level,
      prestige: user.prestige,
      energy: user.energy,
      maxEnergy: user.maxEnergy,
      passiveIncome: passiveIncome,
      upgrades: user.upgrades,
      cards: Object.fromEntries(user.cards),
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralBonus: user.referralBonus,
      dailyBonusStreak: user.dailyBonusStreak,
      comboActive: user.comboActiveUntil && new Date() < user.comboActiveUntil
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ПОКУПКА КАРТОЧКИ ==========
router.post('/buy-card', validateTelegramId, async (req, res) => {
  try {
    const { telegramId, cardId } = req.body;
    const user = await User.findOne({ telegramId });
    const card = await Card.findOne({ cardId });
    
    if (!user || !card) return res.status(404).json({ error: 'Not found' });
    
    const currentLevel = user.cards.get(cardId) || 0;
    if (currentLevel >= card.maxLevel) {
      return res.json({ success: false, message: 'Max level reached!' });
    }
    
    // Расчёт цены с учётом скидки от миньона-помощника
    let price = Math.floor(card.basePrice * Math.pow(card.priceMultiplier, currentLevel));
    const discount = user.upgrades.minionHelper * 2;
    price = Math.floor(price * (1 - discount / 100));
    
    if (user.bananas < price) {
      return res.json({ success: false, message: `Need ${price} bananas!` });
    }
    
    user.bananas -= price;
    user.cards.set(cardId, currentLevel + 1);
    
    // Эффекты от карточек
    if (cardId === 'energy_cell') {
      user.maxEnergy += 10;
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

// ========== ПОЛУЧИТЬ КАРТОЧКИ ==========
router.get('/cards', async (req, res) => {
  try {
    const cards = await Card.find().sort({ order: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== РЕФЕРАЛЬНАЯ ССЫЛКА ==========
router.get('/referral/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const botUsername = process.env.BOT_USERNAME;
    const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;
    
    res.json({ referralLink, referralCount: user.referralCount, referralBonus: user.referralBonus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ЕЖЕДНЕВНЫЙ БОНУС ==========
router.post('/daily-bonus', validateTelegramId, async (req, res) => {
  try {
    const { telegramId } = req.body;
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const now = new Date();
    const lastBonus = user.lastDailyBonus;
    const bonuses = process.env.DAILY_BONUSES.split(',').map(Number);
    
    if (lastBonus && now - lastBonus < 24 * 60 * 60 * 1000) {
      const hoursLeft = 24 - Math.floor((now - lastBonus) / (60 * 60 * 1000));
      return res.json({ success: false, message: `Next bonus in ${hoursLeft} hours` });
    }
    
    let streak = user.dailyBonusStreak;
    if (lastBonus && now - lastBonus < 48 * 60 * 60 * 1000) {
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

// ========== ПРЕСТИЖ ==========
router.post('/prestige', validateTelegramId, async (req, res) => {
  try {
    const { telegramId } = req.body;
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.level < constants.PRESTIGE_LEVEL) {
      return res.json({ success: false, message: `Need level ${constants.PRESTIGE_LEVEL} for prestige!` });
    }
    
    // Сброс прогресса
    user.prestige += 1;
    user.level = 1;
    user.bananas = 0;
    user.upgrades = {
      clickPower: 0,
      autoClicker: 0,
      energy: 0,
      energyRegen: 0,
      critical: 0,
      bananaFarm: 0,
      minionHelper: 0
    };
    
    // Сброс карточек
    const cards = await Card.find();
    cards.forEach(card => {
      user.cards.set(card.cardId, 0);
    });
    
    user.maxEnergy = constants.MAX_ENERGY;
    user.energy = constants.MAX_ENERGY;
    
    await user.save();
    
    res.json({ success: true, prestige: user.prestige, bonus: Math.pow(2, user.prestige) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ТАБЛИЦА ЛИДЕРОВ ==========
router.get('/leaderboard', async (req, res) => {
  try {
    const leaders = await User.find()
      .sort({ totalEarned: -1 })
      .limit(100)
      .select('firstName username photoUrl totalEarned level prestige referralCount');
    
    res.json(leaders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ЗАДАНИЯ ==========
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find({ isActive: true }).sort({ order: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-task', validateTelegramId, async (req, res) => {
  try {
    const { telegramId, taskId } = req.body;
    const user = await User.findOne({ telegramId });
    const task = await Task.findById(taskId);
    
    if (!user || !task) return res.status(404).json({ error: 'Not found' });
    if (user.completedTasks.includes(taskId)) {
      return res.json({ success: false, message: 'Already completed!' });
    }
    
    // В режиме разработки автоматически засчитываем
    if (process.env.NODE_ENV === 'development') {
      user.bananas += task.reward;
      user.totalEarned += task.reward;
      user.completedTasks.push(taskId);
      await user.save();
      return res.json({ success: true, reward: task.reward, balance: user.bananas });
    }
    
    res.json({ success: false, message: 'Complete the task first!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ПРОМОКОДЫ ==========
router.post('/activate-promo', validateTelegramId, async (req, res) => {
  try {
    const { telegramId, code } = req.body;
    const user = await User.findOne({ telegramId });
    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true });
    
    if (!user || !promo) return res.json({ success: false, message: 'Invalid promo code!' });
    if (user.usedPromoCodes.includes(promo.code)) {
      return res.json({ success: false, message: 'Already used!' });
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return res.json({ success: false, message: 'Promo code expired!' });
    }
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return res.json({ success: false, message: 'Promo code expired!' });
    }
    
    user.bananas += promo.reward;
    user.totalEarned += promo.reward;
    user.usedPromoCodes.push(promo.code);
    promo.usedCount += 1;
    await user.save();
    await promo.save();
    
    res.json({ success: true, reward: promo.reward, balance: user.bananas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== КОМБО ДНЯ ==========
router.get('/combo/:telegramId', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const combo = await Combo.findOne({ date: today, isActive: true });
    
    if (!combo) {
      return res.json({ success: false, message: 'No combo today!' });
    }
    
    const user = await User.findOne({ telegramId: req.params.telegramId });
    let hasCombo = false;
    
    if (user) {
      const userCards = user.cards;
      hasCombo = combo.cardIds.every(cardId => (userCards.get(cardId) || 0) > 0);
      
      if (hasCombo && (!user.comboActiveUntil || new Date() > user.comboActiveUntil)) {
        const activeUntil = new Date();
        activeUntil.setHours(activeUntil.getHours() + constants.COMBO_DURATION_HOURS);
        user.comboActiveUntil = activeUntil;
        user.comboMultiplier = combo.bonusMultiplier;
        await user.save();
      }
    }
    
    res.json({ combo: combo.cardIds, hasCombo, bonusMultiplier: combo.bonusMultiplier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;