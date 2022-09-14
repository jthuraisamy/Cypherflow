import { BaseTask } from '../../lib/Cypherflow/tasking/BaseTask';

export class Multiplication extends BaseTask {
  static spec = {
    inputs: [
      {
        name: 'multiplicands',
        isRequired: true,
        patternPath: '(product:Number)<-[r1:MULTIPLICAND]-(multiplicand:Number)',
        fireableWhen: 'multiplicand.taskId IS NOT NULL AND multiplicand.value IS NOT NULL',
      },
      {
        name: 'multipliers',
        isRequired: true,
        patternPath: '(product:Number)<-[r2:MULTIPLIER]-(multiplier:Number)',
        fireableWhen: 'multiplier.taskId IS NOT NULL AND multiplier.value IS NOT NULL',
      },
    ],

    output: {
      name: 'product',
      labels: ['Number'],
      computedWhen: 'product.value IS NOT NULL',
    },
  };

  constructor(graphId, outputNode) {
    super(graphId, outputNode);
    this.step();
  }

  compute: Function = (args) => {
    // Compute!
    let multiplicand = args.multiplicands[0].multiplicand.value;
    let multiplier = args.multipliers[0].multiplier.value;
    let product = multiplicand * multiplier;

    // Print output.
    this.logTask(`=> ${multiplicand} * ${multiplier} = ${product}`);

    // Save into properties.
    this.data.output['properties'].value = product;

    // Computation executed successfully.
    return true;
  };
}
