<template>
  <Header />
  <SearchControls />
  <TaskGraph />
  <TaskTable />
</template>

<script lang="ts">
// @ts-nocheck

import TaskTable from "./components/TaskTable.vue";
import TaskGraph from "./components/TaskGraph.vue";
import SearchControls from "./components/SearchControls.vue";
import Header from "./components/Header.vue";
import { useInterfaceStore } from "./stores/interface";
import { useGraphStore } from "./stores/graph";
import {mapActions, mapStores} from "pinia";
import GRAPH_SUBSCRIPTION from "./graphql/GraphSubscription.graphql";
import TASK_SUBSCRIPTION from "./graphql/TaskSubscription.graphql";

export default {
  name: 'App',

  props: ['graphId'],

  computed: {
    ...mapStores(useInterfaceStore, useGraphStore)
  },

  components: {
    Header,
    SearchControls,
    TaskGraph,
    TaskTable
  },

  methods: {
    ...mapActions(useGraphStore, ['addGraph', 'addTask']),

    subscribeToGraphs() {
      const observer = this.$apollo.subscribe({
        query: GRAPH_SUBSCRIPTION
      });

      observer.subscribe({
        error: error => { console.error(error); },
        next: ({ data }) => {
          // Add graph to store.
          this.addGraph(data.graph);

          // Navigate to graph if it matches the current expression.
          if (data.graph.expression === this.interfaceStore.expression) {
            this.interfaceStore.isAwaitingGraph = false;
            this.$router.push(`/${data.graph.id}`);
          }
        }
      })
    },

    subscribeToTasks() {
      const observer = this.$apollo.subscribe({
        query: TASK_SUBSCRIPTION
      });

      observer.subscribe({
        error: error => { console.error(error); },
        next: ({ data }) => { this.addTask(data.task); }
      })
    }
  },

  /**
   * Validate graphId in route.
   */
  created() {
    this.$watch(() => this.$route.params, (newParams, oldParams) => {
      if (newParams.graphId) {
        if (this.graphStore.graphs[newParams.graphId] === undefined) {
          if (oldParams.graphId) {
            this.$router.push(`/${oldParams.graphId}`);
          } else {
            this.$router.push('/');
          }
        }
      }
    });
  },

  mounted() {
    this.subscribeToGraphs();
    this.subscribeToTasks();
  }
}
</script>

<style>
div.ui.container {
  margin-top: 1em;
}
</style>