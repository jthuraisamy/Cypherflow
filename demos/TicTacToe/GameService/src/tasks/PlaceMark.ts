import { BaseTask } from '../../lib/Cypherflow/tasking/BaseTask';

export class PlaceMark extends BaseTask {
  static spec = {
    inputs: [
      {
        name: 'moves',
        isRequired: true,
        patternPath: '(old:Board)-[move:NEXT_MOVE]->(new:Board)',
        fireableWhen: 'old.taskId IS NOT NULL AND move.value IS NOT NULL',
      },
    ],

    output: {
      name: 'new',
      labels: ['Board'],
      computedWhen: 'new.value IS NOT NULL AND new.state IS NOT NULL',
    },
  };

  constructor(graphId, outputNode) {
    super(graphId, outputNode);
    this.step();
  }

  compute: Function = (args) => {
    // Validate board argument.
    let board = JSON.parse(args.moves[0].old.value);
    if (board.length != 9) {
      return false;
    }

    // Validate move syntax.
    const move = args.moves[0].move.value;
    if (!new RegExp('^[XO][0-8]$').test(move)) {
      return false;
    }

    // Apply move.
    const player = move[0] == 'X' ? 1 : 2;
    const position = move[1];
    if (board[position] === 0) {
      board[position] = player;
    } else {
      return false;
    }

    // Compute state.
    const { state, winningPositions } = this.getState(board);

    // Save properties.
    this.data.output['properties'].value = JSON.stringify(board);
    this.data.output['properties'].state = state;
    this.data.output['properties'].winningPositions = JSON.stringify(winningPositions);

    // Print output.
    this.logTask(`=> ${JSON.stringify(this.data.output['properties'])}`);

    // Computation executed successfully.
    return true;
  };

  getState: Function = (board) => {
    // Look for horizontal or vertical wins.
    for (let i = 0; i < 3; i++) {
      let horizontal = new Set([board[i * 3], board[1 + i * 3], board[2 + i * 3]]);
      if (horizontal.size === 1) {
        if (board[i * 3] === 1) {
          return { state: 'WIN_X', winningPositions: [i * 3, i * 3 + 1, i * 3 + 2] };
        } else if (board[i * 3] === 2) {
          return { state: 'WIN_O', winningPositions: [i * 3, i * 3 + 1, i * 3 + 2] };
        }
      }

      let vertical = new Set([board[i], board[i + 3], board[i + 6]]);
      if (vertical.size === 1) {
        if (board[i] === 1) {
          return { state: 'WIN_X', winningPositions: [i, i + 3, i + 6] };
        } else if (board[i] === 2) {
          return { state: 'WIN_O', winningPositions: [i, i + 3, i + 6] };
        }
      }
    }

    // Look for diagonal wins.
    for (let i = 0; i < 2; i++) {
      let diagonal = new Set([board[i * 2], board[4], board[8 - i * 2]]);
      if (diagonal.size === 1) {
        if (board[4] === 1) {
          return { state: 'WIN_X', winningPositions: [i * 2, 4, 8 - i * 2] };
        } else if (board[4] === 2) {
          return { state: 'WIN_O', winningPositions: [i * 2, 4, 8 - i * 2] };
        }
      }
    }

    // If no win, check if game is still ongoing or a draw.
    if (board.some((m) => m === 0)) {
      return { state: 'ONGOING', winningPositions: [] };
    } else {
      return { state: 'DRAW', winningPositions: [] };
    }
  };
}
