module.exports = {
  // Энергия
  MAX_ENERGY: parseInt(process.env.MAX_ENERGY) || 500,
  ENERGY_PER_CLICK: parseInt(process.env.ENERGY_PER_CLICK) || 5,
  ENERGY_REGEN_TIME: parseInt(process.env.ENERGY_REGEN_TIME) || 30,
  
  // Уровни
  LEVEL_UP_BASE: 10000,
  PRESTIGE_LEVEL: 100,
  PRESTIGE_BONUS: 2,
  
  // Офлайн
  OFFLINE_MAX_HOURS: 24,
  
  // Рефералы
  REFERRAL_BONUS_PERCENT: 1,
  
  // Комбо
  COMBO_BONUS_MULTIPLIER: 10,
  COMBO_DURATION_HOURS: 1
};