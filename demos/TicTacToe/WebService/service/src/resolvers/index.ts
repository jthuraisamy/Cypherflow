import { recommendations } from './Query';
import { submitMove, submitExpression } from './Mutation';
import { graph, task } from './Subscription';

export const resolvers = {
  Query: {
    recommendations,
  },

  Mutation: {
    submitMove,
    submitExpression,
  },

  Subscription: {
    graph,
    task,
  },
};
