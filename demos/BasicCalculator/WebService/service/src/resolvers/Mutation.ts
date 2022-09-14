import pubSub from './Redis';

export const submitExpression = (parent, args) => {
  pubSub.publish('SubmitExpression', args.expression);
  return true;
};
