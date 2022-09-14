import { BaseTask } from './BaseTask';
import { TaskState } from '../types';

export class TaskManager {
  private static instance: TaskManager;
  public graphs: {};

  private constructor() {
    this.graphs = {};
  }

  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }

    return TaskManager.instance;
  }

  public addTask(task: BaseTask) {
    if (!(task.graphId in this.graphs)) {
      this.graphs[task.graphId] = {};
    }

    this.graphs[task.graphId][task.id] = task;
  }

  public removeTask(task: BaseTask) {
    if (task.graphId in this.graphs) {
      if (task.id in this.graphs[task.graphId]) {
        delete this.graphs[task.graphId][task.id];
      }
    }
  }

  public async stepAll(originatingTask) {
    const graphId = originatingTask.graphId;
    for (const taskId in this.graphs[graphId]) {
      const task = this.graphs[graphId][taskId];
      if (['COMPUTED', 'CACHED'].includes(originatingTask.state)) {
        if (task.state === TaskState.Eligible) {
          await task.externalStep();
        }
      }
    }
  }
}
