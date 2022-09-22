import pubSub from './Redis';

export const submitMove = (parent, args) => {
  pubSub.publish('SubmitExpression', JSON.stringify(args));
  return true;
};

export const submitExpression = (parent, args) => {
  pubSub.publish('SubmitExpression', args.expression);
  return true;
};
