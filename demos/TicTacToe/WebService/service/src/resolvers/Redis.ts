import { createPubSub } from '@graphql-yoga/common';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import Redis from 'ioredis';

const pubSub = createPubSub({
  eventTarget: createRedisEventTarget({
    publishClient: new Redis('redis://redis-stack:6379'),
    subscribeClient: new Redis('redis://redis-stack:6379'),
  }),
});

export default pubSub;
