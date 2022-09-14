import { BaseTask } from '../../lib/Cypherflow/tasking/BaseTask';

export class Exponentiation extends BaseTask {
  static spec = {
    inputs: [
      {
        name: 'bases',
        isRequired: true,
        patternPath: '(power:Number)<-[r1:BASE]-(base:Number)',
        fireableWhen: 'base.taskId IS NOT NULL AND base.value IS NOT NULL',
      },
      {
        name: 'exponents',
        isRequired: true,
        patternPath: '(power:Number)<-[r2:EXPONENT]-(exponent:Number)',
        fireableWhen: 'exponent.taskId IS NOT NULL AND exponent.value IS NOT NULL',
      },
    ],

    output: {
      name: 'power',
      labels: ['Number'],
      computedWhen: 'power.value IS NOT NULL',
    },
  };

  constructor(graphId, outputNode) {
    super(graphId, outputNode);
    this.step();
  }

  compute: Function = (args) => {
    // Compute!
    let base = args.bases[0].base.value;
    let exponent = args.exponents[0].exponent.value;
    let power = base ** exponent;

    // Print output.
    this.logTask(`=> ${base} ** ${exponent} = ${power}`);

    // Save into properties.
    this.data.output['properties'].value = power;

    // Computation executed successfully.
    return true;
  };
}
