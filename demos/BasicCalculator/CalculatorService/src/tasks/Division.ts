import { BaseTask } from '../../lib/Cypherflow/tasking/BaseTask';

export class Division extends BaseTask {
  static spec = {
    inputs: [
      {
        name: 'dividends',
        isRequired: true,
        patternPath: '(quotient:Number)<-[r1:DIVIDEND]-(dividend:Number)',
        fireableWhen: 'dividend.taskId IS NOT NULL AND dividend.value IS NOT NULL',
      },
      {
        name: 'divisors',
        isRequired: true,
        patternPath: '(quotient:Number)<-[r2:DIVISOR]-(divisor:Number)',
        fireableWhen: 'divisor.taskId IS NOT NULL AND divisor.value IS NOT NULL',
      },
    ],

    output: {
      name: 'quotient',
      labels: ['Number'],
      computedWhen: 'quotient.value IS NOT NULL',
    },
  };

  constructor(graphId, outputNode) {
    super(graphId, outputNode);
    this.step();
  }

  compute: Function = (args) => {
    // Compute!
    let dividend = args.dividends[0].dividend.value;
    let divisor = args.divisors[0].divisor.value;
    let quotient = dividend / divisor;

    // Handle null divisor to show example of aborted task.
    if (divisor === 0) {
      return false;
    }

    // Print output.
    this.logTask(`=> ${dividend} // ${divisor} = ${quotient}`);

    // Save into properties.
    this.data.output['properties'].value = quotient;

    // Computation executed successfully.
    return true;
  };
}
