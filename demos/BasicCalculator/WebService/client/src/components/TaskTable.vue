<template>
  <div v-if="graphId" class="ui container">
    <table class="ui fixed compact single line selectable celled table">
      <thead>
      <tr>
        <th class="four wide">Task ID</th>
        <th class="four wide">Name</th>
        <th class="four wide">Status</th>
        <th class="four wide">Last Updated</th>
      </tr>
      </thead>
      <tbody>
        <tr v-for="task in tasks || []"
            @mouseover="interfaceStore.selectedTaskId = task.id"
            @mouseout="interfaceStore.selectedTaskId = null"
            :class="{
              warning: ['ELIGIBLE'].includes(task.state),
              active: ['FIREABLE', 'COMPUTING'].includes(task.state),
              positive: ['COMPUTED', 'CACHED'].includes(task.state),
              negative: ['ABORTED'].includes(task.state)
        }">
          <td><code>{{ task.id }}</code></td>
          <td>{{ task.name }}</td>
          <td v-if="task.state === 'INSTANTIATED'">
            <button class="ui black fluid compact button disabled basic">
              <i class="inbox icon"></i>
              Instantiated
            </button>
          </td>
          <td v-else-if="task.state === 'ELIGIBLE'">
            <button class="ui black fluid compact button disabled basic">
              <i class="pause icon"></i>
              Awaiting Data
            </button>
          </td>
          <td v-else-if="task.state === 'FIREABLE'">
            <button class="ui grey fluid compact button disabled basic">
              <i class="play icon"></i>
              Fireable
            </button>
          </td>
          <td v-else-if="task.state === 'CACHED'">
            <button class="ui grey fluid compact button disabled basic">
              <i class="check icon"></i>
              Cached
            </button>
          </td>
          <td v-else-if="task.state === 'COMPUTING'">
            <button class="ui grey fluid compact button disabled basic">
              <i class="hourglass outline icon"></i>
              Computing
            </button>
          </td>
          <td v-else-if="task.state === 'COMPUTED'">
            <button class="ui grey fluid compact button disabled basic">
              <i class="check icon"></i>
              Computed
            </button>
          </td>
          <td v-else-if="task.state === 'ABORTED'">
            <button class="ui grey fluid compact button disabled basic">
              <i class="close icon"></i>
              Aborted
            </button>
          </td>
          <td>{{ getHumanDate(task.timestamp) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
// @ts-nocheck

import moment from "moment";
import { mapStores } from "pinia";
import { useGraphStore } from "../stores/graph";
import { useInterfaceStore } from "../stores/interface";

export default {
  name: "TaskTable",

  computed: {
    ...mapStores(useGraphStore, useInterfaceStore),

    graphId() { return this.$route.params.graphId },

    tasks() {
      let tasks = [];

      if (this.graphStore.graphs[this.graphId]) {
        if (this.graphStore.graphs[this.graphId].tasks) {
          tasks = Object.values(this.graphStore.graphs[this.graphId].tasks);
          tasks = tasks.filter(t => t.state !== 'NOT_ELIGIBLE');
          tasks = tasks.filter(t => t.name !== 'Number');
          tasks.sort((a, b) => b.timestamp - a.timestamp);
        }
      }

      return tasks;
    },
  },

  methods: {
    taskHover() {
      console.log(this.graphId);
      console.log(this.tasks);
    },

    getHumanDate(unixTimestamp) {
      return moment(unixTimestamp * 1000).format('MMMM Do YYYY, h:mm:ss a');
    }
  }
}
</script>

<style scoped>
</style>
