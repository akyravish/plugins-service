/**
 * Messaging barrel export.
 */

export {
  initKafka,
  disconnectKafka,
  getProducer,
  getAdmin,
  sendMessage,
  sendMessages,
  createConsumer,
  stopConsumer,
  createTopic,
  checkKafkaHealth,
  setKafkaLogger,
  kafka,
} from './kafka';

export type { MessageHandler } from './kafka';

