import { Container } from 'inversify';
import { Pool } from 'pg';
import { IEventRepository } from '../../core/interfaces/IEventRepository';
import { IEventQueue } from '../../core/interfaces/IEventQueue';
import { PostgresEventRepository } from '../persistence/PostgresEventRepository';
import { RabbitMQEventQueue } from '../messaging/RabbitMQEventQueue';
import { ProcessEventsUseCase } from '../../core/usecases/ProcessEventsUseCase';
import config from '../../config';

const container = new Container();

// Database
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
});

// Repositories
container.bind<IEventRepository>('EventRepository').toDynamicValue(() => {
  return new PostgresEventRepository(pool);
}).inSingletonScope();

// Messaging
container.bind<IEventQueue>('EventQueue').toDynamicValue(() => {
  return new RabbitMQEventQueue(config.rabbitmq);
}).inSingletonScope();

// Use Cases
container.bind<ProcessEventsUseCase>('ProcessEventsUseCase').to(ProcessEventsUseCase);

export { container }; 