const { Sequelize } = require('sequelize');

// Используем DATABASE_URL из переменных окружения
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');
    
    // Синхронизация моделей (создание таблиц)
    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized');
  } catch (error) {
    console.error('❌ PostgreSQL Error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };