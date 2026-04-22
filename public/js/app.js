// Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// ID пользователя
let userId = tg.initDataUnsafe?.user?.id;
if (!userId) userId = 'demo_' + Math.random().toString(36).substr(2, 9);

// Данные пользователя
let userData = {
  bananas: 0,
  totalEarned: 0,
  level: 1,
  prestige: 0,
  energy: 500,
  maxEnergy: 500,
  passiveIncome: 0,
  upgrades: {},
  cards: {},
  referralCount: 0,
  referralBonus: 0
};

// Инициализация
async function init() {
  // Проверяем реферальный параметр
  const startParam = tg.initDataUnsafe?.start_param;
  
  const res = await fetch('/api/game/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegramId: userId.toString(),
      username: tg.initDataUnsafe?.user?.username,
      firstName: tg.initDataUnsafe?.user?.first_name,
      lastName: tg.initDataUnsafe?.user?.last_name,
      photoUrl: tg.initDataUnsafe?.user?.photo_url,
      referredBy: startParam
    })
  });
  
  const data = await res.json();
  if (data.success) {
    await loadUserData();
    loadCards();
    loadTasks();
    loadLeaderboard();
    loadReferralLink();
  }
}

// Загрузка данных пользователя
async function loadUserData() {
  const res = await fetch(`/api/game/user/${userId}`);
  const data = await res.json();
  userData = data;
  updateUI();
}

// Обновление UI
function updateUI() {
  document.getElementById('balance').innerText = formatNumber(Math.floor(userData.bananas));
  document.getElementById('level').innerText = userData.level;
  document.getElementById('prestige').innerText = userData.prestige;
  document.getElementById('energyText').innerHTML = `${Math.floor(userData.energy)}/${userData.maxEnergy}`;
  document.getElementById('energyFill').style.width = `${(userData.energy / userData.maxEnergy) * 100}%`;
  document.getElementById('passiveIncome').innerHTML = userData.passiveIncome?.toFixed(1) || '0';
  document.getElementById('clickPower').innerHTML = `+${1 + (userData.upgrades?.clickPower || 0)}`;
  document.getElementById('totalEarned').innerHTML = formatNumber(userData.totalEarned);
  
  const critChance = (userData.upgrades?.critical || 0) * 3;
  document.getElementById('critChance').innerHTML = `${critChance}%`;
  
  document.getElementById('referralCount').innerHTML = userData.referralCount;
  document.getElementById('referralBonus').innerHTML = userData.referralBonus;
}

// Форматирование чисел
function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}

// Клик по банану
async function handleClick() {
  try {
    const res = await fetch('/api/game/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: userId.toString() })
    });
    const data = await res.json();
    
    if (data.success) {
      userData.bananas = data.balance;
      userData.energy = data.energy;
      userData.maxEnergy = data.maxEnergy;
      userData.level = data.level;
      updateUI();
      showFloatingNumber(data.reward, data.isCritical);
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      if (data.leveledUp) showMessage(`🎉 Поздравляю! Ты достиг ${data.level} уровня!`);
    } else if (data.error === 'Not enough energy!') {
      if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      showMessage('⚡ Не хватает энергии! Подожди немного.');
    }
  } catch (err) {
    console.error(err);
  }
}

// Всплывающее число
function showFloatingNumber(value, isCritical) {
  const div = document.createElement('div');
  div.className = 'floating-number';
  if (isCritical) div.classList.add('critical-hit');
  div.innerText = `+${value} 🍌`;
  if (isCritical) div.innerText = `⭐ КРИТ! +${value} 🍌`;
  div.style.left = `${Math.random() * 70 + 15}%`;
  div.style.top = '45%';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 800);
}

// Показ сообщения
function showMessage(msg) {
  tg.showPopup({ title: 'Minion Clicker', message: msg, buttons: [{ type: 'ok' }] });
}

// Ежедневный бонус
async function getDailyBonus() {
  const res = await fetch('/api/game/daily-bonus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId: userId.toString() })
  });
  const data = await res.json();
  if (data.success) {
    userData.bananas += data.reward;
    updateUI();
    showMessage(`🎉 Ты получил ${data.reward} 🍌! День ${data.streak}`);
  } else {
    showMessage(data.message);
  }
}

// Престиж
async function doPrestige() {
  const res = await fetch('/api/game/prestige', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId: userId.toString() })
  });
  const data = await res.json();
  if (data.success) {
    showMessage(`✨ Престиж достигнут! Уровень ${data.prestige}. Бонус x${data.bonus}`);
    await loadUserData();
    loadCards();
  } else {
    showMessage(data.message);
  }
}

// Загрузка карточек
async function loadCards() {
  const res = await fetch('/api/game/cards');
  const cards = await res.json();
  const container = document.getElementById('cardsList');
  container.innerHTML = '';
  
  for (const card of cards) {
    const level = userData.cards?.[card.cardId] || 0;
    const price = Math.floor(card.basePrice * Math.pow(card.priceMultiplier, level));
    const discount = (userData.upgrades?.minionHelper || 0) * 2;
    const finalPrice = Math.floor(price * (1 - discount / 100));
    const maxed = level >= card.maxLevel;
    
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    cardEl.innerHTML = `
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.description}</div>
      <div class="card-stats">
        <span class="card-level">Ур. ${level}/${card.maxLevel}</span>
        <span class="card-price">${!maxed ? finalPrice.toLocaleString() + ' 🍌' : 'MAX'}</span>
      </div>
      <button class="buy-card-btn ${maxed || userData.bananas < finalPrice ? 'disabled' : ''}" data-card="${card.cardId}">
        ${maxed ? '✅ МАКСИМУМ' : '📈 УЛУЧШИТЬ'}
      </button>
    `;
    container.appendChild(cardEl);
  }
  
  document.querySelectorAll('.buy-card-btn[data-card]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cardId = btn.dataset.card;
      const res = await fetch('/api/game/buy-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: userId.toString(), cardId })
      });
      const data = await res.json();
      if (data.success) {
        userData.bananas = data.balance;
        userData.maxEnergy = data.maxEnergy;
        updateUI();
        loadCards();
        showMessage(`✅ Карточка улучшена! Новый уровень ${data.newLevel}`);
      } else {
        showMessage(data.message);
      }
    });
  });
}

// Загрузка заданий
async function loadTasks() {
  const res = await fetch('/api/game/tasks');
  const tasks = await res.json();
  const container = document.getElementById('tasksList');
  container.innerHTML = '';
  
  if (tasks.length === 0) {
    container.innerHTML = '<div class="task-item">Пока нет заданий. Заходи позже!</div>';
    return;
  }
  
  for (const task of tasks) {
    const taskEl = document.createElement('div');
    taskEl.className = 'task-item';
    taskEl.innerHTML = `
      <div class="task-info">
        <h4>${task.title}</h4>
        <p>${task.description}</p>
        <span class="task-reward">🎁 Награда: ${task.reward.toLocaleString()} 🍌</span>
      </div>
      <button class="task-btn" data-id="${task._id}">ВЫПОЛНИТЬ</button>
    `;
    container.appendChild(taskEl);
  }
  
  document.querySelectorAll('.task-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await fetch('/api/game/check-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: userId.toString(), taskId: btn.dataset.id })
      });
      const data = await res.json();
      if (data.success) {
        userData.bananas = data.balance;
        updateUI();
        showMessage(`✅ Задание выполнено! +${data.reward} 🍌`);
        loadTasks();
      } else {
        showMessage(data.message);
      }
    });
  });
}

// Загрузка таблицы лидеров
async function loadLeaderboard() {
  const res = await fetch('/api/game/leaderboard');
  const leaders = await res.json();
  const container = document.getElementById('leaderboardList');
  container.innerHTML = '';
  
  leaders.slice(0, 100).forEach((user, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤';
    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    item.innerHTML = `
      <div class="rank">${medal} #${idx + 1}</div>
      <div class="player-avatar">${user.photoUrl ? '' : '🐤'}</div>
      <div class="player-name">${user.firstName || 'Миньон'}</div>
      <div class="player-stats">
        <div class="player-bananas">${formatNumber(user.totalEarned)} 🍌</div>
        <div class="player-level">Ур. ${user.level} | 👥 ${user.referralCount || 0}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Загрузка реферальной ссылки
async function loadReferralLink() {
  const res = await fetch(`/api/game/referral/${userId}`);
  const data = await res.json();
  document.getElementById('referralLink').innerHTML = data.referralLink;
  document.getElementById('referralCount').innerHTML = data.referralCount;
  document.getElementById('referralBonus').innerHTML = data.referralBonus;
  
  document.getElementById('copyReferralBtn').onclick = () => {
    navigator.clipboard.writeText(data.referralLink);
    showMessage('📋 Ссылка скопирована!');
  };
}

// Табы
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = {
    clicker: document.getElementById('clickerTab'),
    cards: document.getElementById('cardsTab'),
    tasks: document.getElementById('tasksTab'),
    friends: document.getElementById('friendsTab'),
    leaderboard: document.getElementById('leaderboardTab')
  };
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(contents).forEach(content => content.classList.remove('active'));
      contents[tabName].classList.add('active');
      
      if (tabName === 'cards') loadCards();
      if (tabName === 'tasks') loadTasks();
      if (tabName === 'leaderboard') loadLeaderboard();
      if (tabName === 'friends') loadReferralLink();
    });
  });
}

// Пассивный доход
let passiveInterval;
function startPassiveIncome() {
  if (passiveInterval) clearInterval(passiveInterval);
  passiveInterval = setInterval(async () => {
    if (userData.passiveIncome > 0) {
      const res = await fetch('/api/game/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: userId.toString() })
      });
      const data = await res.json();
      if (data.success) {
        userData.bananas = data.balance;
        updateUI();
      }
    }
  }, 1000);
}

// Регенерация энергии
setInterval(async () => {
  await loadUserData();
}, 30000);

// Инициализация
document.getElementById('clickArea').addEventListener('click', handleClick);
document.getElementById('dailyBonusBtn').addEventListener('click', getDailyBonus);
document.getElementById('prestigeBtn').addEventListener('click', doPrestige);
setupTabs();

init();
startPassiveIncome();