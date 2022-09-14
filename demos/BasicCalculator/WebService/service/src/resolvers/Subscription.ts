import pubSub from './Redis';

export const graph = {
  subscribe: () => pubSub.subscribe('CreateGraph'),

  resolve: (payload) => {
    return payload;
  },
};

export const task = {
  subscribe: () => pubSub.subscribe('TaskStatus'),

  resolve: (payload) => {
    return payload;
  },
};
