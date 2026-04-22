const constants = require('../config/constants');

// Расчёт стоимости улучшения
const calculateUpgradePrice = (basePrice, currentLevel, multiplier = 1.5) => {
  return Math.floor(basePrice * Math.pow(multiplier, currentLevel));
};

// Расчёт пассивного дохода в секунду
const calculatePassiveIncome = (user, cards) => {
  let income = 0;
  
  // Доход от карточек
  if (user.cards && cards) {
    user.cards.forEach((level, cardId) => {
      const card = cards.find(c => c.cardId === cardId);
      if (card) {
        income += card.profitPerHour / 3600 * level;
      }
    });
  }
  
  // Доход от автокликера
  income += user.upgrades.autoClicker * 0.5;
  
  // Доход от банановой фермы
  income += user.upgrades.bananaFarm * 1;
  
  // Бонус от рефералов
  income *= (1 + user.referralBonus / 100);
  
  // Бонус от комбо
  if (user.comboActiveUntil && new Date() < user.comboActiveUntil) {
    income *= constants.COMBO_BONUS_MULTIPLIER;
  }
  
  return income;
};

// Расчёт офлайн дохода
const calculateOfflineIncome = (user, secondsOffline, cards) => {
  const passiveIncome = calculatePassiveIncome(user, cards);
  const maxSeconds = constants.OFFLINE_MAX_HOURS * 3600;
  const validSeconds = Math.min(secondsOffline, maxSeconds);
  return passiveIncome * validSeconds;
};

module.exports = { calculateUpgradePrice, calculatePassiveIncome, calculateOfflineIncome };