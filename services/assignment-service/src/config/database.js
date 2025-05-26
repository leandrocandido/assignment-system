require('dotenv').config();

module.exports = {
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'assignment_service',
  host: process.env.POSTGRES_HOST || 'postgres', // Using the service name from docker-compose
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  dialect: 'postgres',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
}; 