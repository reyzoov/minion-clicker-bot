// Конфигурация карточек улучшений (как в Hamster Kombat)
const cards = [
  {
    cardId: 'click_power',
    name: '💪 Крепкий палец',
    description: 'Увеличивает силу клика',
    icon: '💪',
    basePrice: 100,
    priceMultiplier: 1.5,
    profitPerHour: 50,
    maxLevel: 10
  },
  {
    cardId: 'banana_farm',
    name: '🍌 Банановая ферма',
    description: 'Пассивный доход от бананов',
    icon: '🍌',
    basePrice: 500,
    priceMultiplier: 1.6,
    profitPerHour: 200,
    maxLevel: 10
  },
  {
    cardId: 'minion_helper',
    name: '🐤 Миньон-помощник',
    description: 'Уменьшает стоимость прокачки',
    icon: '🐤',
    basePrice: 1000,
    priceMultiplier: 1.7,
    profitPerHour: 400,
    maxLevel: 10
  },
  {
    cardId: 'super_suit',
    name: '👓 Супер комбинезон',
    description: 'Увеличивает энергию',
    icon: '👓',
    basePrice: 2000,
    priceMultiplier: 1.8,
    profitPerHour: 800,
    maxLevel: 10
  },
  {
    cardId: 'rocket_booster',
    name: '🚀 Ракетный ускоритель',
    description: 'Ускоряет восстановление энергии',
    icon: '🚀',
    basePrice: 5000,
    priceMultiplier: 1.9,
    profitPerHour: 1500,
    maxLevel: 10
  },
  {
    cardId: 'critical_strike',
    name: '⭐ Критический удар',
    description: 'Шанс на x5 бананов',
    icon: '⭐',
    basePrice: 3000,
    priceMultiplier: 1.75,
    profitPerHour: 1000,
    maxLevel: 10
  },
  {
    cardId: 'auto_clicker',
    name: '🤖 Автокликер',
    description: 'Автоматический клик',
    icon: '🤖',
    basePrice: 8000,
    priceMultiplier: 2.0,
    profitPerHour: 2500,
    maxLevel: 10
  },
  {
    cardId: 'energy_cell',
    name: '🔋 Энергоячейка',
    description: 'Увеличивает макс. энергию',
    icon: '🔋',
    basePrice: 4000,
    priceMultiplier: 1.85,
    profitPerHour: 1200,
    maxLevel: 10
  }
];

module.exports = cards;