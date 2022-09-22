import neo4j from 'neo4j-driver';
import { Semaphore } from 'await-semaphore';

const experienceGraph = neo4j.driver('bolt://experience-graph:7687');
const semaphore = new Semaphore(1);

/**
 * Execute a read query and return the transaction.
 */
export const executeReadQuery = async (query) => {
  const release = await semaphore.acquire();
  const session = experienceGraph.session();
  const transaction = await session.readTransaction((tx) => tx.run(query));
  await session.close();
  release();
  return transaction;
};

export const recommendations = async (parent, args) => {
  let recommendations = [];

  const board = JSON.stringify(args.board);
  const outcome = args.player === 1 ? 'WIN_X' : 'WIN_O';

  const transaction = await executeReadQuery(`
    MATCH (:Board {value: '${board}'})-[moves:NEXT_MOVE *]->(terminal:Board {state: '${outcome}'})
    RETURN moves;
  `);

  if (transaction.records.length > 0) {
    for (const record of transaction.records) {
      let path = [];

      for (const move of record.get('moves')) {
        path.push(move.properties.value);
      }

      recommendations.push(path);
    }
  }

  return recommendations;
};
