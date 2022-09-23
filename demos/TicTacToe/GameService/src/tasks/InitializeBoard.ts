import { BaseTask } from '../../lib/Cypherflow/tasking/BaseTask';

export class InitializeBoard extends BaseTask {
  static spec = {
    inputs: [
      {
        name: 'boards',
        isRequired: true,
        patternPath: '(old:Board)',
        fireableWhen: 'old.value IS NOT NULL AND old.taskId IS NULL',
      },
    ],

    output: {
      name: 'old',
      labels: ['Board'],
      computedWhen: 'old.value IS NOT NULL AND old.taskId IS NOT NULL',
    },
  };

  constructor(graphId, outputNode) {
    super(graphId, outputNode);
    this.step();
  }

  compute: Function = (args) => {
    // Save properties.
    this.data.output['properties'].value = JSON.stringify([...Array(9)].map((x) => 0));
    this.data.output['properties'].state = 'ONGOING';

    // Print output.
    this.logTask(`=> ${JSON.stringify(this.data.output['properties'])}`);

    // Computation executed successfully.
    return true;
  };
}
