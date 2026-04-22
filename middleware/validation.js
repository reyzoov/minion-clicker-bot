const validateTelegramId = (req, res, next) => {
  const { telegramId } = req.body;
  if (!telegramId || typeof telegramId !== 'string') {
    return res.status(400).json({ error: 'Invalid telegramId' });
  }
  next();
};

const validateUpgrade = (req, res, next) => {
  const { upgradeId } = req.body;
  const validUpgrades = ['clickPower', 'autoClicker', 'energy', 'energyRegen', 'critical', 'bananaFarm', 'minionHelper'];
  if (!validUpgrades.includes(upgradeId)) {
    return res.status(400).json({ error: 'Invalid upgrade ID' });
  }
  next();
};

module.exports = { validateTelegramId, validateUpgrade };