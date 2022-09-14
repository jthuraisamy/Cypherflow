<script lang="ts">
// @ts-nocheck

import {gql} from "@apollo/client/core";
import { mapStores } from "pinia";
import { useGraphStore } from "../stores/graph";

export default {
  name: 'HelloWorld',

  props: ['msg'],

  computed: {
    ...mapStores(useGraphStore)
  },

  data() {
    return {
      count: 0
    }
  },

  mounted() {
    const query = gql`
      subscription Graph {
        graph {
          id
          expression
        }
      }
    `;

    const observer = this.$apollo.subscribe({
      query
    });

    observer.subscribe({
      error: error => { console.error(error); },
      next: ({ data }) => {
        let graph = data.graph;
        this.graphStore.graphs[graph.id] = graph;
        console.log(data);
      }
    })
  }

  /*
  apollo: {
    $subscribe: {
      graph: {
        query: gql`
          subscription Graph {
            graph {
              id
              expression
            }
          }`,

        result (data: any) {
          console.log(data);
        }
      }
    }
  }
  */
}
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Install
    <a href="https://github.com/johnsoncodehk/volar" target="_blank">Volar</a>
    in your IDE for a better DX
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
  <ol>
    <li v-for="graph in graphStore.graphs">
      {{ graph.id }}
    </li>
  </ol>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
