const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromoCode = sequelize.define('PromoCode', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  reward: { type: DataTypes.FLOAT, allowNull: false },
  maxUses: { type: DataTypes.INTEGER, defaultValue: 100 },
  usedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.STRING, defaultValue: '' }
}, {
  tableName: 'promo_codes',
  timestamps: true
});

module.exports = PromoCode;