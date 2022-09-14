import { BaseTask } from '../../lib/Cypherflow/tasking/BaseTask';

export class Subtraction extends BaseTask {
  static spec = {
    inputs: [
      {
        name: 'minuends',
        isRequired: true,
        patternPath: '(difference:Number)<-[r1:MINUEND]-(minuend:Number)',
        fireableWhen: 'minuend.taskId IS NOT NULL AND minuend.value IS NOT NULL',
      },
      {
        name: 'subtrahends',
        isRequired: true,
        patternPath: '(difference:Number)<-[r2:SUBTRAHEND]-(subtrahend:Number)',
        fireableWhen: 'subtrahend.taskId IS NOT NULL AND subtrahend.value IS NOT NULL',
      },
    ],

    output: {
      name: 'difference',
      labels: ['Number'],
      computedWhen: 'difference.value IS NOT NULL',
    },
  };

  constructor(graphId, outputNode) {
    super(graphId, outputNode);
    this.step();
  }

  compute: Function = (args) => {
    // Compute!
    let minuend = args.minuends[0].minuend.value;
    let subtrahend = args.subtrahends[0].subtrahend.value;
    let difference = minuend - subtrahend;

    // Print output.
    this.logTask(`=> ${minuend} - ${subtrahend} = ${difference}`);

    // Save into properties.
    this.data.output['properties'].value = difference;

    // Computation executed successfully.
    return true;
  };
}
