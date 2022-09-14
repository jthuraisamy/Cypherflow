import { parse, UNSTABLE__format } from 'cypher.js';
import { ulid } from 'ulid';
import { Semaphore } from 'await-semaphore';

const semaphore = new Semaphore(1);

/**
 * Execute a read query and return the transaction.
 */
export const executeReadQuery = async (driver, query) => {
  const release = await semaphore.acquire();

  const session = driver.session();
  const transaction = await session.readTransaction((tx) => tx.run(query));
  await session.close();

  release();
  return transaction;
};

/**
 * Execute a write query and return the transaction.
 */
export const executeWriteQuery = async (driver, query) => {
  const release = await semaphore.acquire();

  const session = driver.session();
  const transaction = await session.writeTransaction((tx) => tx.run(query));
  await session.close();

  release();
  return transaction;
};

/**
 * Return node/relationship names associated with given path.
 */
export const getIdentifiersFromPath = (path: string) => {
  let identifiers = [];
  let ast = parse(`MATCH ${path};`);

  ast.root.body.clauses.forEach((clause) => {
    if (clause.pattern.paths.length === 1) {
      clause.pattern.paths[0].elements.forEach((element) => {
        if (element.identifier) {
          identifiers.push(element.identifier.name);
        }
      });
    }
  });

  return identifiers;
};

/**
 * Populate an input path string with properties from a record.
 */
export const populatePath = (inputPath, outputSpec, record) => {
  let ast = parse(`MATCH ${inputPath};`);
  let elements = ast.root.body.clauses[0].pattern.paths[0].elements;

  for (const element of elements) {
    if (element.identifier) {
      let recordProperties = record[element.identifier.name];
      element.properties = { type: 'map', entries: {} };

      for (const key in recordProperties) {
        element.properties.entries[key] = {
          type: isNaN(recordProperties[key]) ? 'string' : 'integer',
          value: recordProperties[key],
        };
      }

      if (element.identifier.name !== outputSpec.name) {
        element.identifier.name = `E${ulid()}`;
      }
    }
  }

  let queryOneLine = UNSTABLE__format(ast).replaceAll('\n', ' ');
  return queryOneLine.match(/^MATCH\s(?<path>.*);$/).groups.path;
};

/**
 * Remove output labels from path.
 */
export const scrubOutputLabelsFromPath = (path, identifier) => {
  let ast = parse(`MATCH ${path};`);
  let elements = ast.root.body.clauses[0].pattern.paths[0].elements;

  for (const element of elements) {
    if (element.identifier) {
      if (element.identifier.name === identifier) {
        delete element.labels;
      }
    }
  }

  return UNSTABLE__format(ast).match(/^MATCH\s(?<path>.*);$/).groups.path;
};

export const parseQuery = parse;
export const constructQuery = UNSTABLE__format;
