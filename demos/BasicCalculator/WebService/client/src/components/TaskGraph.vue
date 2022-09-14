<template>
  <div v-show="graphId" class="ui container">
    <table class="ui top attached celled single line very compact fixed table">
      <tbody>
        <tr class="center aligned">
          <td>Legend</td>
          <td class="computed">Computed</td>
          <td class="cached">Cached</td>
          <td class="computing">Computing</td>
          <td class="eligible">Awaiting Data</td>
          <td class="aborted">Aborted</td>
        </tr>
      </tbody>
    </table>
    <div id="task-graph" class="ui bottom attached"></div>
  </div>
</template>

<script lang="ts">
// @ts-nocheck

import { Network } from "vis-network";
import { mapStores } from 'pinia';
import { toRaw } from "vue";
import { useGraphStore } from "../stores/graph";
import { useInterfaceStore } from "../stores/interface";

export default {
  name: "TaskGraph",

  data() {
    return {
      network: null
    }
  },

  computed: {
    ...mapStores(useGraphStore, useInterfaceStore),

    graphId() { return this.$route.params.graphId },

    nodes() {
      let nodes = [];
      let graph = this.graphStore.graphs[this.graphId];
      let selectedTaskId = this.interfaceStore.selectedTaskId;

      // No nodes if no graph.
      if (!graph) { return []; }

      for (const node of graph.nodes) {
        let properties = JSON.parse(node.properties);
        let label = (properties.value !== undefined) ? `${properties.value}` : '?';

        // Determine node color.
        let nodeColor = this.getColor(node.state);

        // Gray-out the node if it's not part of the selected task.
        if (selectedTaskId) {
          if (graph.tasks[selectedTaskId].outputNode.id !== node.id) {
            nodeColor = 'lightgrey';
          }
        }

        nodes.push({
          id: node.id,
          label: label,
          shape: 'box',
          color: nodeColor
        });
      }

      return nodes;
    },

    edges() {
      let edges = [];
      let graph = this.graphStore.graphs[this.graphId];
      let selectedTaskId = this.interfaceStore.selectedTaskId;

      // No edges if no graph.
      if (!graph) { return []; }

      for (const edge of graph.edges) {
        // Determine edge color.
        let edgeColor = this.getColor(edge.state);

        // Gray-out the edge if it's not part of the selected task.
        if (selectedTaskId) {
          if (!graph.tasks[selectedTaskId].adjacentEdges.includes(edge.id)) {
            edgeColor = 'lightgrey';
          }
        }

        edges.push({
          id: edge.id,
          from: edge.startNode,
          to: edge.endNode,
          label: edge.type,
          font: { align: "bottom" },
          color: edgeColor,
          arrows: "to"
        });
      }

      return edges;
    },

    graphData() {
      return {
        nodes: this.nodes,
        edges: this.edges
      }
    }
  },

  methods: {
    getColor(state) {
      switch (state) {
        case 'ELIGIBLE':
          return 'hsl(50 100% 55%)';
        case 'FIREABLE':
        case 'COMPUTING':
          return 'hsl(200 75% 75%)';
        case 'COMPUTED':
          return 'hsl(120 75% 75%)';
        case 'CACHED':
          return 'hsl(160 50% 75%)';
        case 'ABORTED':
          return 'hsl(350 100% 75%)';
        default:
          return 'lightgrey';
      }
    }
  },

  watch: {
    graphData(newData, oldData) {
      toRaw(this.network)['setData'](newData);
    }
  },

  mounted() {
    const container = document.getElementById("task-graph");
    const options = { layout: { randomSeed: 0 } };
    this.network = new Network(container, this.graphData, options);
  }
}
</script>

<style scoped>
div#task-graph {
  height: 500px;
  border: 1px solid #eee;
}

td.cached { background-color: hsl(160 50% 95%); }
td.computed { background-color: hsl(120 75% 95%); }
td.computing { background-color: hsl(200 75% 95%); }
td.eligible { background-color: hsl(50 100% 95%); }
td.aborted { background-color: hsl(350 100% 95%); }
</style>
