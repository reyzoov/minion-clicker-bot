const User = require('../models/User');

const isAdmin = async (telegramId) => {
  const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
  if (adminIds.includes(telegramId)) return true;
  const user = await User.findOne({ telegramId });
  return user?.isAdmin || false;
};

const authAdmin = async (req, res, next) => {
  const { telegramId } = req.body;
  if (!telegramId || !(await isAdmin(telegramId))) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

module.exports = { isAdmin, authAdmin };