import { BaseTask } from '../tasking/BaseTask';

export interface Drivers {
  redisPublisher: any;
  redisSubscriber: any;
  neo4jSubmissions: any;
  neo4jExperience: any;
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
