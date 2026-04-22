// Форматирование чисел
const formatNumber = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
};

// Генерация случайного кода
const generateCode = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
};

// Проверка активности комбо
const isComboActive = (user) => {
  return user.comboActiveUntil && new Date() < user.comboActiveUntil;
};

module.exports = { formatNumber, generateCode, isComboActive };