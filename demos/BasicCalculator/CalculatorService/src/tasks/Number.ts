import { BaseTask } from '../../lib/Cypherflow/tasking/BaseTask';

export class Number extends BaseTask {
  static spec = {
    inputs: [
      {
        name: 'numbers',
        isRequired: true,
        patternPath: '(number:Number)',
        fireableWhen: 'number.value IS NOT NULL AND number.taskId IS NULL',
      },
    ],

    output: {
      name: 'number',
      labels: ['Number'],
      computedWhen: 'number.value IS NOT NULL AND number.taskId IS NOT NULL',
    },
  };

  constructor(graphId, outputNode) {
    super(graphId, outputNode);
    this.step();
  }

  compute: Function = (args) => {
    // Save into properties.
    let number = this.data.output['properties'].value;

    // Print output.
    this.logTask(`=> ${number}`);

    // Computation executed successfully.
    return true;
  };
}
