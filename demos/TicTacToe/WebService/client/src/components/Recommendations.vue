<script setup lang="ts">
// @ts-nocheck

import { provideApolloClient, useQuery } from '@vue/apollo-composable';
import { apolloClient } from '@/graphql';
import { useGameStore } from '@/stores/game';
import gql from 'graphql-tag';
import { onMounted, watch } from 'vue';

provideApolloClient(apolloClient);
const store = useGameStore();

function getRecommendations(board) {
  // Get recommendations.
  const { onResult } = useQuery(
    gql`
      query GetRecommendations($board: [Int!]!, $player: Int) {
        recommendations(board: $board, player: $player)
      }
    `,
    {
      board: board,
      player: store.currentPlayer,
    },
    {
      fetchPolicy: 'cache-and-network',
    }
  );

  onResult((result) => {
    store.recommendations = result.data.recommendations;
  });
}

onMounted(() => getRecommendations(store.board));
watch(() => store.board, getRecommendations);
</script>

<template>
  <div class="ui info message">
    <h3 class="ui header">Recommendations for Player {{ store.currentPlayerName }}</h3>
    <table v-if="store.recommendations.length > 0" class="ui celled compact small table">
      <thead>
        <tr>
          <th class="two wide">Move</th>
          <th>Path</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(value, key) in store.uniqueRecommendations">
          <td>{{ key }}</td>
          <td>{{ value.join(' ➔ ') }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>None available (add more <i>experience</i> first).</p>
  </div>
</template>

<style scoped>
.trajectory {
  color: darkgrey;
}
</style>
