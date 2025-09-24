import { Config } from 'sequelize';

const config: Config = {
  development: {
    username: 'root',
    password: 'root',
    database: 'ctm_telecom',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: console.log,
  },
  test: {
    username: 'root',
    password: 'root',
    database: 'ctm_telecom_test',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'ctm_telecom',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
  }
};

export default config;
