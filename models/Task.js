const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  type: {
    type: DataTypes.ENUM('channel', 'daily', 'one-time'),
    defaultValue: 'channel'
  },
  channelLink: { type: DataTypes.STRING, defaultValue: '' },
  channelId: { type: DataTypes.STRING, defaultValue: '' },
  reward: { type: DataTypes.FLOAT, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  order: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'tasks',
  timestamps: true
});

module.exports = Task;