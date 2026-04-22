const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  telegramId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  username: { type: DataTypes.STRING, defaultValue: '' },
  firstName: { type: DataTypes.STRING, defaultValue: '' },
  lastName: { type: DataTypes.STRING, defaultValue: '' },
  photoUrl: { type: DataTypes.STRING, defaultValue: '' },
  
  // Баланс
  bananas: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalEarned: { type: DataTypes.FLOAT, defaultValue: 0 },
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  prestige: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  // Энергия
  energy: { type: DataTypes.FLOAT, defaultValue: 500 },
  maxEnergy: { type: DataTypes.FLOAT, defaultValue: 500 },
  lastEnergyUpdate: { type: DataTypes.DATE, defaultValue: Date.now },
  
  // Улучшения (храним как JSON)
  upgrades: {
    type: DataTypes.JSONB,
    defaultValue: {
      clickPower: 0,
      autoClicker: 0,
      energy: 0,
      energyRegen: 0,
      critical: 0,
      bananaFarm: 0,
      minionHelper: 0
    }
  },
  
  // Карточки (храним как JSON)
  cards: { type: DataTypes.JSONB, defaultValue: {} },
  
  // Рефералы
  referralCode: { type: DataTypes.STRING, unique: true },
  referredBy: { type: DataTypes.STRING, defaultValue: null },
  referrals: { type: DataTypes.JSONB, defaultValue: [] },
  referralCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  referralBonus: { type: DataTypes.FLOAT, defaultValue: 0 },
  
  // Ежедневные бонусы
  dailyBonusStreak: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastDailyBonus: { type: DataTypes.DATE, defaultValue: null },
  
  // Задания и промокоды
  completedTasks: { type: DataTypes.JSONB, defaultValue: [] },
  usedPromoCodes: { type: DataTypes.JSONB, defaultValue: [] },
  
  // Комбо
  comboActiveUntil: { type: DataTypes.DATE, defaultValue: null },
  comboMultiplier: { type: DataTypes.FLOAT, defaultValue: 1 },
  
  // Системные
  lastOnline: { type: DataTypes.DATE, defaultValue: Date.now },
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: Date.now }
}, {
  tableName: 'users',
  timestamps: false
});

// Генерация реферального кода
User.beforeCreate(async (user) => {
  if (!user.referralCode) {
    user.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
});

// Метод обновления уровня
User.prototype.updateLevel = function() {
  const newLevel = Math.floor(this.totalEarned / 10000) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
    return true;
  }
  return false;
};

// Метод восстановления энергии
User.prototype.regenEnergy = function() {
  const now = Date.now();
  const secondsPassed = (now - new Date(this.lastEnergyUpdate).getTime()) / 1000;
  const regenRate = 1 / 30;
  const bonusRegen = (this.upgrades.energyRegen || 0) * 0.05;
  const totalRegen = regenRate + bonusRegen;
  const newEnergy = Math.min(this.maxEnergy, this.energy + secondsPassed * totalRegen);
  this.energy = newEnergy;
  this.lastEnergyUpdate = new Date(now);
  return this.energy;
};

module.exports = User;