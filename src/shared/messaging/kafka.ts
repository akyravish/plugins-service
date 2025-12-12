/**
 * Kafka client for message queue operations.
 * Provides producer and consumer functionality for inter-service communication.
 */

import { Kafka, Producer, Consumer, Admin, logLevel, EachMessagePayload, Partitioners } from 'kafkajs';
import { config } from '../../config';

// Logger will be injected to avoid circular dependencies
type Logger = {
  info: (msg: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
};

let logger: Logger | null = null;

/**
 * Set the logger instance for Kafka logging.
 */
export function setKafkaLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

/**
 * Create Kafka instance with custom logger
 * Only logs WARN and ERROR to reduce noise from heartbeats/fetches
 */
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN, // Only WARN and ERROR - reduces heartbeat/fetch noise
  logCreator: () => {
    return ({ level, log }) => {
      const { message, ...extra } = log;
      if (logger) {
        if (level === logLevel.ERROR || level === logLevel.NOTHING) {
          logger.error({ ...extra }, message);
        } else if (level === logLevel.WARN) {
          logger.warn({ ...extra }, message);
        }
        // Skip INFO/DEBUG logs (heartbeats, fetches, etc.)
      }
    };
  },
});

let producer: Producer | null = null;
let admin: Admin | null = null;
const consumers: Map<string, Consumer> = new Map();

/**
 * Initialize Kafka producer and admin
 */
export async function initKafka(): Promise<void> {
  try {
    // Initialize admin
    admin = kafka.admin();
    await admin.connect();
    logger?.info('Kafka admin connected');

    // Initialize producer with legacy partitioner to avoid warning
    producer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    await producer.connect();
    logger?.info('Kafka producer connected');
  } catch (error) {
    logger?.error({ error }, 'Failed to initialize Kafka');
    throw error;
  }
}

/**
 * Disconnect all Kafka clients
 */
export async function disconnectKafka(): Promise<void> {
  const disconnectPromises: Array<Promise<void>> = [];

  // Disconnect all consumers
  for (const [groupId, consumer] of consumers) {
    disconnectPromises.push(
      consumer.disconnect().then(() => {
        logger?.info(`Kafka consumer ${groupId} disconnected`);
      }),
    );
  }
  consumers.clear();

  // Disconnect producer
  if (producer) {
    disconnectPromises.push(
      producer.disconnect().then(() => {
        logger?.info('Kafka producer disconnected');
        producer = null;
      }),
    );
  }

  // Disconnect admin
  if (admin) {
    disconnectPromises.push(
      admin.disconnect().then(() => {
        logger?.info('Kafka admin disconnected');
        admin = null;
      }),
    );
  }

  await Promise.all(disconnectPromises);
}

/**
 * Get the Kafka producer instance
 */
export function getProducer(): Producer {
  if (!producer) {
    throw new Error('Kafka producer not initialized. Call initKafka() first.');
  }
  return producer;
}

/**
 * Get the Kafka admin instance
 */
export function getAdmin(): Admin {
  if (!admin) {
    throw new Error('Kafka admin not initialized. Call initKafka() first.');
  }
  return admin;
}

/**
 * Send a message to a Kafka topic
 */
export async function sendMessage<T>(
  topic: string,
  message: T,
  key?: string,
): Promise<void> {
  const kafkaProducer = getProducer();
  
  await kafkaProducer.send({
    topic,
    messages: [
      {
        key: key || undefined,
        value: JSON.stringify(message),
        timestamp: Date.now().toString(),
      },
    ],
  });
}

/**
 * Send multiple messages to a Kafka topic
 */
export async function sendMessages<T>(
  topic: string,
  messages: Array<{ message: T; key?: string }>,
): Promise<void> {
  const kafkaProducer = getProducer();

  await kafkaProducer.send({
    topic,
    messages: messages.map((m) => ({
      key: m.key || undefined,
      value: JSON.stringify(m.message),
      timestamp: Date.now().toString(),
    })),
  });
}

/**
 * Message handler type
 */
export type MessageHandler<T = unknown> = (
  message: T,
  metadata: {
    topic: string;
    partition: number;
    offset: string;
    key: string | null;
    timestamp: string;
  },
) => Promise<void>;

/**
 * Create and start a consumer for a topic
 */
export async function createConsumer<T = unknown>(
  groupId: string,
  topics: string[],
  handler: MessageHandler<T>,
): Promise<Consumer> {
  // Check if consumer already exists
  if (consumers.has(groupId)) {
    throw new Error(`Consumer with groupId ${groupId} already exists`);
  }

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  
  // Subscribe to topics
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  // Start consuming
  await consumer.run({
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      try {
        const value = message.value?.toString();
        if (!value) return;

        const parsedMessage = JSON.parse(value) as T;
        
        await handler(parsedMessage, {
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString() || null,
          timestamp: message.timestamp,
        });
      } catch (error) {
        logger?.error({ error, topic, partition }, 'Error processing Kafka message');
      }
    },
  });

  consumers.set(groupId, consumer);
  logger?.info(`Kafka consumer ${groupId} started for topics: ${topics.join(', ')}`);

  return consumer;
}

/**
 * Stop and remove a consumer
 */
export async function stopConsumer(groupId: string): Promise<void> {
  const consumer = consumers.get(groupId);
  if (consumer) {
    await consumer.disconnect();
    consumers.delete(groupId);
    logger?.info(`Kafka consumer ${groupId} stopped`);
  }
}

/**
 * Create a topic if it doesn't exist
 */
export async function createTopic(
  topic: string,
  numPartitions: number = 1,
  replicationFactor: number = 1,
): Promise<void> {
  const kafkaAdmin = getAdmin();
  
  const existingTopics = await kafkaAdmin.listTopics();
  if (existingTopics.includes(topic)) {
    return;
  }

  await kafkaAdmin.createTopics({
    topics: [
      {
        topic,
        numPartitions,
        replicationFactor,
      },
    ],
  });
  
  logger?.info(`Kafka topic ${topic} created`);
}

/**
 * Check if Kafka is healthy
 */
export async function checkKafkaHealth(): Promise<boolean> {
  try {
    if (!admin) return false;
    await admin.listTopics();
    return true;
  } catch {
    return false;
  }
}

/**
 * Export Kafka instance for advanced usage
 */
export { kafka };

