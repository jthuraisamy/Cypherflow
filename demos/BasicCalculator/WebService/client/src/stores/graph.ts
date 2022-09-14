// @ts-nocheck

import { defineStore } from 'pinia';

export const useGraphStore = defineStore('graph', {
  state: () => ({
    graphs: {},
  }),

  actions: {
    addGraph(graph) {
      this.graphs[graph.id] = graph;
    },

    addTask(task) {
      // Add task to graph.
      let graph = this.graphs[task.graphId];
      if (graph.tasks === undefined) {
        graph.tasks = {};
      }
      graph.tasks[task.id] = task;

      // Get output node from graph.
      let node = this.graphs[task.graphId].nodes.find((n) => n.id === task.outputNode.id);

      // Set node state.
      if (task.state !== 'NOT_ELIGIBLE') {
        node['state'] = task.state;
      }

      // Set node properties.
      if (['CACHED', 'COMPUTED'].includes(task.state)) {
        node['properties'] = task.outputNode.properties;
      }

      // Log task.
      // console.table({
      //   name: task.name,
      //   state: task.state,
      //   id: task.outputNode.id,
      //   properties: node['properties'],
      //   adjacentEdges: JSON.stringify(task.adjacentEdges),
      // });

      // Update state of adjacent edges.
      if (task.name !== 'Number') {
        if (task.adjacentEdges.length > 0) {
          for (const edgeId of task.adjacentEdges) {
            let edge = this.graphs[task.graphId].edges.find((e) => e.id === edgeId);
            edge['state'] = task.state;
          }
        }
      }
    },
  },
});
