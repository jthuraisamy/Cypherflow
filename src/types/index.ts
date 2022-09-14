import { BaseTask } from '../tasking/BaseTask';

export interface Drivers {
  redisPublisher: any;
  redisSubscriber: any;
  neo4jGenerator: any;
  neo4jDiscriminator: any;
}

export interface TaskClass {
  new (graphId, outputNode): BaseTask;
}

export enum TaskState {
  Instantiated = 'INSTANTIATED',
  Eligible = 'ELIGIBLE',
  NotEligible = 'NOT_ELIGIBLE',
  Fireable = 'FIREABLE',
  Cached = 'CACHED',
  Queued = 'QUEUED',
  Computing = 'COMPUTING',
  Computed = 'COMPUTED',
  Aborted = 'ABORTED',
}
