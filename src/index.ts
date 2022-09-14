import { ulid } from 'ulid';
import Redis from 'ioredis';
import neo4j from 'neo4j-driver';
import { Drivers, TaskClass } from './types';
import { TaskManager } from './tasking/TaskManager';
import { BaseTask } from './tasking/BaseTask';
import { executeReadQuery, executeWriteQuery } from './helpers/Cypher';

export class Cypherflow {
  private static instance: Cypherflow;
  private expressionParser: Function;
  private supportedTaskTypes: TaskClass[];
  private drivers: Drivers;
  private taskManager: TaskManager;

  constructor({ servers, expressionParser, supportedTaskTypes }) {
    this.expressionParser = expressionParser;
    this.supportedTaskTypes = supportedTaskTypes;
    this.drivers = this.initializeDrivers(servers);
    this.taskManager = TaskManager.getInstance();
  }

  public static startInstance({ servers, expressionParser, supportedTaskTypes }): Cypherflow {
    if (!Cypherflow.instance) {
      Cypherflow.instance = new Cypherflow({
        servers,
        expressionParser,
        supportedTaskTypes,
      });
    }

    return Cypherflow.instance;
  }

  public static getInstance(): Cypherflow {
    return Cypherflow.instance;
  }

  initializeDrivers(servers): Drivers {
    return {
      redisPublisher: new Redis(servers.messageBroker),
      redisSubscriber: new Redis(servers.messageBroker),
      neo4jGenerator: neo4j.driver(servers.generatorGraph),
      neo4jDiscriminator: neo4j.driver(servers.discriminatorGraph),
    };
  }

  getDrivers(): Drivers {
    return this.drivers;
  }

  /**
   * Subscribe to topics and listen for messages.
   */
  listen() {
    const topics = ['SubmitExpression', 'CreateGraph', 'TaskStatus'];

    // @ts-ignore
    this.drivers.redisSubscriber.subscribe(topics, (err, count) => {
      console.log(`Subscribed to ${count} channels: ${topics.join(', ')}.`);
    });

    // @ts-ignore
    this.drivers.redisSubscriber.on('message', async (channel, message) => {
      const payload = JSON.parse(message);

      switch (channel) {
        case 'SubmitExpression':
          await this.createGraph(payload);
          break;
        case 'CreateGraph':
          await this.createTasks(payload);
          break;
        case 'TaskStatus':
          await this.taskManager.stepAll(payload);
          break;
      }
    });
  }

  /**
   * Create graph in Generator DB given an expression.
   */
  async createGraph(expression: string) {
    const id = ulid();
    const query = this.expressionParser(id, expression);

    // Return blank graph if there is no query.
    if (!query) {
      return this.drivers.redisPublisher.publish(
        'CreateGraph',
        JSON.stringify({
          id,
          expression,
          nodes: [],
          edges: [],
        })
      );
    }

    // Write graph.
    await executeWriteQuery(this.drivers.neo4jGenerator, query.join('\n'));

    // Read graph records.
    const readTransaction = await executeReadQuery(
      this.drivers.neo4jGenerator,
      `MATCH (n)-[r {graphId: "${id}"}]-(m) RETURN n, r;`
    );

    // Process nodes from records.
    let nodes = [];
    for (const record of readTransaction.records) {
      let { identity, labels, properties } = record.get('n');

      // Skip node if it's already in array.
      if (nodes.some(({ id }) => id === `${identity.toNumber()}`)) {
        continue;
      }

      // Convert every Integer to Number in properties.
      for (const key in properties) {
        if (neo4j.isInt(properties[key])) {
          properties[key] = properties[key].toNumber();
        }
      }

      // Add new node.
      nodes.push({
        id: `${identity.toNumber()}`,
        labels: labels,
        properties: JSON.stringify(properties),
      });
    }

    // Process edges from records.
    let edges = [];
    for (const record of readTransaction.records) {
      let { identity, start, end, type, properties } = record.get('r');

      // Skip edge if it's already in array.
      if (edges.some(({ id }) => id === `${identity.toNumber()}`)) {
        continue;
      }

      // Convert every Integer to Number in properties.
      for (const key in properties) {
        if (neo4j.isInt(properties[key])) {
          properties[key] = properties[key].toNumber();
        }
      }

      // Add new edge.
      edges.push({
        id: `${identity.toNumber()}`,
        type,
        startNode: `${start}`,
        endNode: `${end}`,
        properties: JSON.stringify(properties),
      });
    }

    let graphObject = {
      id,
      expression,
      nodes,
      edges,
    };

    return this.drivers.redisPublisher.publish('CreateGraph', JSON.stringify(graphObject));
  }

  /**
   * Spin up tasks for a given graph.
   */
  async createTasks(graph) {
    for (const TaskType of this.supportedTaskTypes) {
      // Find eligible output nodes for this task.
      const eligibleNodes = await BaseTask.findEligibleNodes({
        drivers: this.drivers,
        graphId: graph.id,
        taskType: TaskType,
      });

      // Create a task for each output node.
      for (const outputNode of eligibleNodes) {
        let task = new TaskType(graph.id, outputNode);
        this.taskManager.addTask(task);
      }
    }
  }
}
