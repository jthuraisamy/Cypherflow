import { hello } from './Query';
import { submitExpression } from './Mutation';
import { graph, task } from './Subscription';

export const resolvers = {
  Query: {
    hello,
  },

  Mutation: {
    submitExpression,
  },

  Subscription: {
    graph,
    task,
  },
};
