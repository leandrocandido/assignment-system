import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  dialect: 'postgres';
  logging: boolean;
  define: {
    timestamps: boolean;
    underscored: boolean;
  };
}

const config: DatabaseConfig = {
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'relay_service',
  host: process.env.POSTGRES_HOST || 'postgres', // Using the service name from docker-compose
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  dialect: 'postgres',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
};

export default config; 