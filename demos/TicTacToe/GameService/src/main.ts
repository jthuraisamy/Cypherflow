import { Cypherflow } from '../lib/Cypherflow';
import { InitializeBoard } from './tasks/InitializeBoard';
import { PlaceMark } from './tasks/PlaceMark';
import { convertJsonExpressionToQuery } from './parsers/JsonExpression';

const service = Cypherflow.startInstance({
  servers: {
    messageBroker: 'redis://redis-stack:6379',
    submissionsGraph: 'bolt://submissions-graph:7687',
    experienceGraph: 'bolt://experience-graph:7687',
  },

  expressionParser: convertJsonExpressionToQuery,
  supportedTaskTypes: [InitializeBoard, PlaceMark],
});

service.listen();
