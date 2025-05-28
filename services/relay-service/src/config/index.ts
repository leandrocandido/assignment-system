import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface RabbitMQConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  vhost: string;
}

interface Config {
  env: string;
  database: DatabaseConfig;
  rabbitmq: RabbitMQConfig;
  eventLimit: number;
  cronExpression: string;
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'relay_service',
  },
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
    user: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    vhost: process.env.RABBITMQ_VHOST || '/',
  },
  eventLimit: parseInt(process.env.EVENT_LIMIT || '10', 10),
  cronExpression: process.env.CRON_EXPRESSION || '*/15 * * * * *',
};

export default config; 