import { ulid } from 'ulid';
import * as moment from 'moment';
import neo4j from 'neo4j-driver';
import { Semaphore } from 'await-semaphore';
import { Cypherflow } from '../index';
import { executeReadQuery, executeWriteQuery } from '../helpers/Cypher';
import { Drivers, TaskState } from '../types';
import { TaskManager } from './TaskManager';
import {
  parseQuery,
  constructQuery,
  populatePath,
  getIdentifiersFromPath,
  scrubOutputLabelsFromPath,
} from '../helpers/Cypher';

const taskManager = TaskManager.getInstance();

export class BaseTask {
  static spec;

  public id: string = ulid();
  public graphId: string;
  public state: TaskState;

  protected compute: Function;
  protected data = { input: {}, output: {} };

  private drivers: Drivers = Cypherflow.getInstance().getDrivers();
  private semaphore: Semaphore;

  constructor(graphId, outputNode) {
    this.graphId = graphId;
    this.data.output['id'] = outputNode.identity.toNumber();
    this.data.output['adjacentEdges'] = [];
    this.data.output['properties'] = outputNode.properties;
    this.setState(TaskState.Instantiated);
    this.semaphore = new Semaphore(1);
  }

  public async externalStep() {
    if (this.state === TaskState.Eligible) {
      const release = await this.semaphore.acquire();
      await this.step();
      release();
    }
  }

  public async step() {
    // Fake sleep.
    let duration = Math.ceil(Math.random() * 250);
    await new Promise((r) => setTimeout(r, duration));

    // Handle current state.
    switch (this.state) {
      case TaskState.Instantiated:
        await this.onInstantiated();
        break;
      case TaskState.Eligible:
        await this.onEligible();
        break;
      case TaskState.Fireable:
        await this.onFireable();
        break;
      case TaskState.Computing:
        await this.onComputing();
        break;
      case TaskState.NotEligible:
      case TaskState.Cached:
      case TaskState.Computed:
      case TaskState.Aborted:
        await this.onTerminal();
        break;
      default:
        console.log(this.state);
    }
  }

  /**
   * Log message related to task.
   */
  logTask(message: string) {
    let date = new Date().toISOString();
    let taskId = `${this.constructor.name.slice(0, 3)}(${this.id})`;
    console.log(`${date} - ${taskId}: ${message}`);
  }

  /**
   * Set new TaskState and emit details over Redis.
   */
  setState(newState: TaskState) {
    this.state = newState;
    this.logTask(newState);

    // Convert Integer to Number in properties.
    let properties = this.data.output['properties'];
    for (const key in properties) {
      if (neo4j.isInt(properties[key])) {
        properties[key] = properties[key].toNumber();
      }
    }

    let spec = this.constructor['spec'];
    let payload = JSON.stringify({
      id: this.id,
      graphId: this.graphId,
      timestamp: moment().unix(),
      name: this.constructor.name,
      state: this.state,
      adjacentEdges: this.data.output['adjacentEdges'],
      outputNode: {
        id: `${this.data.output['id']}`,
        labels: spec.output.labels,
        properties: JSON.stringify(properties),
      },
    });

    this.drivers.redisPublisher.publish('TaskStatus', payload);
  }

  /**
   * During the Instantiated state:
   *   - Check if the provided output node is eligible for this task (i.e. matching sub-graph).
   *   - If so, step into the Eligible state.
   *
   * Differently-shaped tasks can have the same type of output node, so this function checks
   * if the nodes/edges of this task corresponds to how the output node is shaped.
   */
  async onInstantiated() {
    if (await this.isEligible()) {
      this.setState(TaskState.Eligible);
    } else {
      this.setState(TaskState.NotEligible);
    }

    await this.step();
  }

  /**
   * During the Eligible state:
   *   - Check if input arguments have valid values for search/computation.
   *   - If so, populate the arguments and step into the Fireable state.
   */
  async onEligible() {
    if (await this.isFireable()) {
      this.setState(TaskState.Fireable);
      await this.step();
    }
  }

  /**
   * During the Fireable state:
   *   - Populate input arguments into Task.
   *   - Search in Experience Graph for existing computation.
   *     - If successful, set task to Cached state.
   *     - If unsuccessful, step into the Computation state.
   */
  async onFireable() {
    // Populate input arguments into Task.
    await this.populateInputRecords();

    // Check if results are cached, set state accordingly.
    if (await this.isCached()) {
      this.setState(TaskState.Cached);
      // await this.updateExperienceGraph(); // might be redundant
    } else {
      this.setState(TaskState.Computing);
    }

    // Step into next state.
    await this.step();
  }

  /**
   * During the Computing state:
   *   - Execute the task with provided arguments.
   */
  async onComputing() {
    // Fake sleep.
    await new Promise((r) => setTimeout(r, 1000));

    // Create arguments object.
    //   - First populate it with properties defined in output node.
    //   - Then populate it with the input arguments.
    let args: any = { ...this.data.output['properties'] };
    for (const input in this.data.input) {
      args[input] = this.data.input[input];
    }

    // Call the Task's executor function.
    if (this.compute(args)) {
      this.setState(TaskState.Computed);
      await this.updateExperienceGraph();
      await this.updateSubmissionsGraph();
    } else {
      this.setState(TaskState.Aborted);
    }
  }

  /**
   * During a terminal state:
   * - Remove the task from the TaskManager.
   */
  async onTerminal() {
    taskManager.removeTask(this);
  }

  /**
   * Query the Submissions Graph to check if the provided output node is
   * eligible for this task (i.e. required paths are satisfied).
   */
  async isEligible() {
    let spec = this.constructor['spec'];

    for (const input of spec.inputs) {
      let query = [];

      // Determine MATCH type and identifiers in path.
      let matchType = input.isRequired ? 'MATCH' : 'OPTIONAL MATCH';
      let pathIdentifiers = getIdentifiersFromPath(input.patternPath);

      // Add query lines.
      query.push(`${matchType} ${input.patternPath}`);
      query.push(`WHERE ID(${spec.output.name}) = ${this.data.output['id']}`);
      query.push(`RETURN ${pathIdentifiers.join(', ')};`);

      // Execute query.
      let queryText = query.join('\n');
      let pathTransaction = await executeReadQuery(this.drivers.neo4jSubmissions, queryText);

      // Return false if there were no records for a required input.
      if (pathTransaction.records.length === 0) {
        if (input.isRequired) {
          return false;
        }

        // Populate adjacentEdges array if there are records.
      } else {
        for (const record of pathTransaction.records) {
          for (const identifier of record.keys) {
            const element = record.get(identifier);

            // Identify whether edge is adjacent to output node.
            if (neo4j.isInt(element.end)) {
              if (this.data.output['id'] == element.end.toNumber()) {
                this.data.output['adjacentEdges'].push(element.identity.toNumber());
              }
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Query the Submissions Graph to check if all the input arguments are
   * available for potential computation to begin.
   */
  async isFireable() {
    let spec = this.constructor['spec'];

    for (const input of spec.inputs) {
      let query = [];

      // Add query lines.
      query.push(`MATCH ${input.patternPath} WHERE NOT(${input.fireableWhen})`);
      query.push(`MATCH (${spec.output.name}:${spec.output.labels.join(':')})`);
      query.push(`WHERE ID(${spec.output.name}) = ${this.data.output['id']}`);
      query.push(`RETURN ${spec.output.name};`);

      // Execute query.
      let queryText = query.join('\n');
      let pathTransaction = await executeReadQuery(this.drivers.neo4jSubmissions, queryText);

      // Return false if any records were returned, which indicates there are
      // some input arguments that are currently not yet available.
      if (pathTransaction.records.length > 0) {
        return false;
      }
    }

    // At this point, there have been no records for each transaction which
    // means the task is fireable because all input arguments are available.
    return true;
  }

  /**
   * Query the Experience Graph to check if this Task output is already cached.
   */
  async isCached() {
    let spec = this.constructor['spec'];
    let matchQuery = [];

    // Add query lines for input.
    for (const input of spec.inputs) {
      for (const record of this.data.input[input.name]) {
        // Remove graphId, taskId from record's elements.
        let genericRecord = JSON.parse(JSON.stringify(record));
        for (let identifier in genericRecord) {
          if ('graphId' in genericRecord[identifier]) {
            delete genericRecord[identifier]['graphId'];
          }
          if ('taskId' in genericRecord[identifier]) {
            delete genericRecord[identifier]['taskId'];
          }
        }
        matchQuery.push(`MATCH ${populatePath(input.patternPath, spec.output, genericRecord)}`);
      }
    }

    // Add query line for output/return.
    matchQuery.push(`MATCH (${spec.output.name}:${spec.output.labels.join(':')}) WHERE ${spec.output.computedWhen}`);
    matchQuery.push(`RETURN ${spec.output.name};`);

    // Execute MATCH query.
    let matchQueryText = matchQuery.join('\n');
    let matchTransaction = await executeReadQuery(this.drivers.neo4jExperience, matchQueryText);

    // Merge output properties from DG into GG and return true.
    if (matchTransaction.records.length > 0) {
      let setQuery = [];
      setQuery.push(`MATCH (${spec.output.name}:${spec.output.labels.join(':')})`);
      setQuery.push(`WHERE ID(${spec.output.name}) = ${this.data.output['id']}`);

      // Extract properties from first record.
      let record = matchTransaction.records[0];
      let properties = record.get(spec.output.name).properties;
      this.data.output['properties'] = properties;

      for (const key in properties) {
        // Convert Integer to Number in properties.
        if (neo4j.isInt(properties[key])) {
          properties[key] = properties[key].toNumber();
        }

        // Add SET clauses to query.
        setQuery.push(`SET ${spec.output.name}.${key} = ${JSON.stringify(properties[key])}`);
      }

      // Execute SET query.
      let setQueryText = `${setQuery.join('\n')};`;
      await executeWriteQuery(this.drivers.neo4jSubmissions, setQueryText);

      return true;
    }

    // Return false because no cached records returned.
    return false;
  }

  /**
   * Populate the Task's inputs with arguments.
   */
  async populateInputRecords() {
    let spec = this.constructor['spec'];

    for (const input of spec.inputs) {
      let query = [];
      this.data.input[input.name] = [];

      // Determine MATCH type and identifiers in path.
      let matchType = input.isRequired ? 'MATCH' : 'OPTIONAL MATCH';

      let pathIdentifiers = getIdentifiersFromPath(input.patternPath);
      // Add query lines.
      query.push(`${matchType} ${input.patternPath} WHERE ${input.fireableWhen}`);
      query.push(`MATCH (${spec.output.name}:${spec.output.labels.join(':')})`);
      query.push(`WHERE ID(${spec.output.name}) = ${this.data.output['id']}`);

      query.push(`RETURN ${pathIdentifiers.join(', ')};`);
      // Execute query.
      let queryText = query.join('\n');

      let pathTransaction = await executeReadQuery(this.drivers.neo4jSubmissions, queryText);

      // Populate records for input.
      if (pathTransaction.records.length > 0) {
        for (const record of pathTransaction.records) {
          let elements = {};

          // Each record has properties for each element.
          for (const identifier of record.keys) {
            const element = record.get(identifier);

            // Convert Integer to Number in the element's properties.
            elements[identifier] = element.properties;
            for (const property in elements[identifier]) {
              const value = elements[identifier][property];
              if (neo4j.isInt(value)) {
                elements[identifier][property] = value.toNumber();
              } else if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                  if (neo4j.isInt(value[i])) {
                    elements[identifier][property][i] = value[i].toNumber();
                  }
                }
              }
            }
          }

          // Store elements in record.
          this.data.input[input.name].push(elements);
        }
      }
    }
  }

  async updateExperienceGraph() {
    let spec = this.constructor['spec'];

    // If output node already exists, update the properties for this task.
    let outputRecord = {};
    const outputPattern = `(${spec.output.name}:${spec.output.labels.join(':')})`;
    const { graphId, taskId, ...sanitizedProperties } = this.data.output['properties'];
    outputRecord[spec.output.name] = sanitizedProperties;
    let outputPath = populatePath(outputPattern, spec.output, outputRecord);

    // Execute MATCH query.
    const matchQuery = `MATCH ${outputPath} RETURN ${spec.output.name};`;
    const matchTransaction = await executeReadQuery(this.drivers.neo4jExperience, matchQuery);
    if (matchTransaction.records.length > 0) {
      // Extract properties from first record.
      let record = matchTransaction.records[0];
      let properties = record.get(spec.output.name).properties;
      this.data.output['properties'] = properties;

      for (const key in properties) {
        // Convert Integer to Number in properties.
        if (neo4j.isInt(properties[key])) {
          properties[key] = properties[key].toNumber();
        }
      }
    }

    // Add MERGE clause for output.
    outputRecord[spec.output.name] = this.data.output['properties'];
    outputRecord[spec.output.name]['taskId'] = outputRecord[spec.output.name]['taskId'] || this.id;
    outputPath = populatePath(outputPattern, spec.output, outputRecord);
    let ast = parseQuery(`MERGE ${outputPath}`);

    // Add MERGE clause for each record, and MATCH clauses for each node within.
    for (const input of spec.inputs) {
      // Skip input if the only node in pattern is the output node.
      let inputIdentifiers = getIdentifiersFromPath(input.patternPath);
      if (inputIdentifiers.length === 1) {
        if (inputIdentifiers[0] === spec.output.name) {
          continue;
        }
      }

      // Process each record.
      for (const record of this.data.input[input.name]) {
        let scrubbedPath = scrubOutputLabelsFromPath(input.patternPath, spec.output.name);
        let recordPath = populatePath(scrubbedPath, spec.output, record);
        let recordMatchAst = parseQuery(`MATCH ${recordPath}`);

        // Construct MATCH clauses for each named input node w/ properties within AST.
        let namedNodes = [];
        for (const element of recordMatchAst.root.body.clauses[0].pattern.paths[0].elements) {
          if (element.type === 'node-pattern') {
            if (element.identifier && Object.keys(element.properties.entries).length > 0) {
              if (element.identifier.name !== spec.output.name) {
                if (element.properties.entries.graphId) {
                  delete element.properties.entries['graphId'];
                }

                namedNodes.push(element);
              }
            }
          }
        }
        for (const node of namedNodes) {
          let matchAst = { ...recordMatchAst };
          matchAst.root.body.clauses[0].pattern.paths[0].elements = [{ ...node }];
          ast.root.body.clauses.unshift(matchAst.root.body.clauses[0]);
        }

        // Scrub labels/properties from nodes in recordPath AST to construct MERGE clause.
        let recordMergeAst = parseQuery(`MERGE ${recordPath}`);
        for (const element of recordMergeAst.root.body.clauses[0].path.elements) {
          if (element.type === 'node-pattern') {
            delete element.labels;
            delete element.properties;
          }
        }
        ast.root.body.clauses.push(recordMergeAst.root.body.clauses[0]);
      }
    }

    // Execute query.
    let queryText = constructQuery(ast);
    await executeWriteQuery(this.drivers.neo4jExperience, queryText);
  }

  async updateSubmissionsGraph() {
    let spec = this.constructor['spec'];

    // Initialize AST.
    let ast = parseQuery(`
      MATCH (${spec.output.name}:${spec.output.labels.join(':')})
      WHERE ID(${spec.output.name}) = ${this.data.output['id']}`);

    // Create action items for each property that needs to be set.
    for (const key in this.data.output['properties']) {
      ast.root.body.clauses.push({
        type: 'set',
        items: [
          {
            type: 'set-property',
            property: {
              type: 'property-operator',
              expression: { type: 'identifier', name: spec.output.name },
              propName: { type: 'prop-name', value: key },
            },
            expression: {
              type: 'integer',
              value: this.data.output['properties'][key],
            },
          },
        ],
      });
    }

    // Update the query and execute it.
    let queryText = constructQuery(ast);
    await executeWriteQuery(this.drivers.neo4jSubmissions, queryText);
  }

  static async findEligibleOutputNodesInSubmissionGraph({ drivers, graphId, taskType }) {
    let query: string = `
      MATCH (${taskType.spec.output.name}:${taskType.spec.output.labels.join(':')})
      WHERE (${taskType.spec.output.name}.graphId = "${graphId}") AND NOT(${taskType.spec.output.computedWhen})
      RETURN ${taskType.spec.output.name};
    `;

    let transaction = await executeReadQuery(drivers.neo4jSubmissions, query);
    return transaction.records.map((r) => r._fields).flat();
  }
}
