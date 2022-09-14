import { BaseTask } from '../../lib/Cypherflow/tasking/BaseTask';

export class Addition extends BaseTask {
  static spec = {
    inputs: [
      {
        name: 'augends',
        isRequired: true,
        patternPath: '(sum:Number)<-[r1:AUGEND]-(augend:Number)',
        fireableWhen: 'augend.taskId IS NOT NULL AND augend.value IS NOT NULL',
      },
      {
        name: 'addends',
        isRequired: true,
        patternPath: '(sum:Number)<-[r2:ADDEND]-(addend:Number)',
        fireableWhen: 'addend.taskId IS NOT NULL AND addend.value IS NOT NULL',
      },
    ],

    output: {
      name: 'sum',
      labels: ['Number'],
      computedWhen: 'sum.value IS NOT NULL',
    },
  };

  constructor(graphId, outputNode) {
    super(graphId, outputNode);
    this.step();
  }

  compute: Function = (args) => {
    // Compute!
    let augend = args.augends[0].augend.value;
    let addend = args.addends[0].addend.value;
    let sum = augend + addend;

    // Print output.
    this.logTask(`=> ${augend} + ${addend} = ${sum}`);

    // Save into properties.
    this.data.output['properties'].value = sum;

    // Computation executed successfully.
    return true;
  };
}
