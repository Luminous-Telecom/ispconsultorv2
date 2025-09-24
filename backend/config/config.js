module.exports = {
  development: {
    username: 'root',
    password: '',
    database: 'erp_assessoria',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: console.log,
  },
  test: {
    username: 'root',
    password: '',
    database: 'erp_assessoria_test',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    username: 'root',
    password: '',
    database: 'erp_assessoria',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false,
  }
};
