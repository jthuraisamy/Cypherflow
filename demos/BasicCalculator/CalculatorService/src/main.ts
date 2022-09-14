import { Cypherflow } from '../lib/Cypherflow';
import { Number } from './tasks/Number';
import { Exponentiation } from './tasks/Exponentiation';
import { Multiplication } from './tasks/Multiplication';
import { Division } from './tasks/Division';
import { Addition } from './tasks/Addition';
import { Subtraction } from './tasks/Subtraction';
import { convertArithmeticExpressionToQuery } from './parsers/ArithmeticExpression';

const service = Cypherflow.startInstance({
  servers: {
    messageBroker: 'redis://redis-stack:6379',
    generatorGraph: 'bolt://memgraph-generator:7687',
    discriminatorGraph: 'bolt://memgraph-discriminator:7687',
  },

  expressionParser: convertArithmeticExpressionToQuery,
  supportedTaskTypes: [Number, Exponentiation, Multiplication, Division, Addition, Subtraction],
});

service.listen();
