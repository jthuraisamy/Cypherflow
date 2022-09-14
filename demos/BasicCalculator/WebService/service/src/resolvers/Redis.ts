import { createPubSub } from '@graphql-yoga/common';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import Redis from 'ioredis';

const pubSub = createPubSub({
  eventTarget: createRedisEventTarget({
    publishClient: new Redis(6379, 'redis-stack'),
    subscribeClient: new Redis(6379, 'redis-stack'),
  }),
});

export default pubSub;
