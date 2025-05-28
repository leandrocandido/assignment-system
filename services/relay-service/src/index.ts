import 'reflect-metadata';
import { CronJob } from 'cron';
import { container } from './infrastructure/di/container';
import { ProcessEventsUseCase } from './core/usecases/ProcessEventsUseCase';
import { IEventQueue } from './core/interfaces/IEventQueue';
import config from './config';

// Get instances from container
const processEvents = container.get<ProcessEventsUseCase>('ProcessEventsUseCase');
const eventQueue = container.get<IEventQueue>('EventQueue');

// Set up event response handling
eventQueue.consumeResponse(async (response) => {
  await processEvents.handleResponse(response);
});

// Set up cron job for processing events
const job = new CronJob(config.cronExpression, async () => {
  try {
    const result = await processEvents.execute({
      batchSize: config.eventLimit
    });

    console.log(
      `Processed ${result.processedCount} events (${result.failedCount} failed)`
    );
  } catch (error) {
    console.error('Error processing events:', error);
  }
});

// Start the cron job
job.start();

console.log(`Relay service started in ${config.env} mode`);
console.log(`Processing up to ${config.eventLimit} events every ${config.cronExpression}`);

// Handle shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  job.stop();
  await eventQueue.close();
  process.exit(0);
}); 