const mongoose = require('mongoose');
const constants = require('../config/constants');

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: { type: String, default: '' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  
  // Баланс и прогресс
  bananas: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  prestige: { type: Number, default: 0 },
  
  // Энергия
  energy: { type: Number, default: constants.MAX_ENERGY },
  maxEnergy: { type: Number, default: constants.MAX_ENERGY },
  lastEnergyUpdate: { type: Date, default: Date.now },
  
  // Улучшения (уровни 0-10)
  upgrades: {
    clickPower: { type: Number, default: 0 },
    autoClicker: { type: Number, default: 0 },
    energy: { type: Number, default: 0 },
    energyRegen: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
    bananaFarm: { type: Number, default: 0 },
    minionHelper: { type: Number, default: 0 }
  },
  
  // Карточки улучшений
  cards: { type: Map, of: Number, default: {} },
  
  // Рефералы
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },
  referrals: [{ type: String }],
  referralCount: { type: Number, default: 0 },
  referralBonus: { type: Number, default: 0 },
  
  // Ежедневные бонусы
  dailyBonusStreak: { type: Number, default: 0 },
  lastDailyBonus: { type: Date, default: null },
  
  // Задания и промокоды
  completedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  usedPromoCodes: [{ type: String }],
  
  // Комбо
  comboActiveUntil: { type: Date, default: null },
  comboMultiplier: { type: Number, default: 1 },
  
  // Системные поля
  lastOnline: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Генерация реферального кода
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

// Обновление уровня
userSchema.methods.updateLevel = function() {
  const newLevel = Math.floor(this.totalEarned / constants.LEVEL_UP_BASE) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
    return true;
  }
  return false;
};

// Восстановление энергии
userSchema.methods.regenEnergy = function() {
  const now = Date.now();
  const secondsPassed = (now - this.lastEnergyUpdate) / 1000;
  const regenRate = 1 / constants.ENERGY_REGEN_TIME;
  const bonusRegen = this.upgrades.energyRegen * 0.05;
  const totalRegen = regenRate + bonusRegen;
  const newEnergy = Math.min(this.maxEnergy, this.energy + secondsPassed * totalRegen);
  this.energy = newEnergy;
  this.lastEnergyUpdate = now;
  return this.energy;
};

// Расчёт пассивного дохода
userSchema.methods.calculatePassiveIncome = function() {
  let income = 0;
  // Базовый доход от карточек
  if (this.cards) {
    this.cards.forEach((level, cardId) => {
      // Доход рассчитывается в контроллере
    });
  }
  // Доход от автокликера
  income += this.upgrades.autoClicker * 0.5;
  // Доход от банановой фермы
  income += this.upgrades.bananaFarm * 1;
  // Бонус от рефералов
  income *= (1 + this.referralBonus / 100);
  // Бонус от комбо
  if (this.comboActiveUntil && new Date() < this.comboActiveUntil) {
    income *= this.comboMultiplier;
  }
  return income;
};

module.exports = mongoose.model('User', userSchema);