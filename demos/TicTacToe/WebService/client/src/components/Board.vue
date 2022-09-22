<script setup lang="ts">
// @ts-nocheck

import { watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { provideApolloClient, useMutation, useQuery, useSubscription } from '@vue/apollo-composable';
import { useGameStore } from '@/stores/game';
import { apolloClient } from '@/graphql';
import gql from 'graphql-tag';

provideApolloClient(apolloClient);
const router = useRouter();
const route = useRoute();
const store = useGameStore();

onMounted(() => {
  store.route = route.params.board;
});

watch(
  () => route.params.board,
  (newBoard) => {
    store.route = newBoard;

    if (store.route === '0-0-0-0-0-0-0-0-0') {
      store.state = 'INITIALIZED';
      store.winningPositions = [];
      store.path = [];
    }
  }
);

const { mutate } = useMutation(gql`
  mutation SubmitMove($board: [Int!]!, $move: String!) {
    submitMove(board: $board, move: $move)
  }
`);

function submitMove(position) {
  const playerName = store.currentPlayer === 1 ? 'X' : 'O';
  const nextMove = `${playerName}${position}`;
  store.selectedPosition = position;
  store.path.push(nextMove);
  mutate({ board: store.board, move: nextMove });
}

const { onResult } = useSubscription(gql`
  subscription TaskSubscription {
    task {
      id
      name
      state
      outputNode {
        properties
      }
    }
  }
`);

onResult((result) => {
  const task = result.data.task;

  if (task.name === 'PlaceMark') {
    if (['COMPUTED', 'CACHED'].includes(task.state)) {
      // Update board and state.
      const props = JSON.parse(task.outputNode.properties);
      const board = JSON.parse(props.value);
      store.state = props.state;
      store.winningPositions = JSON.parse(props.winningPositions);
      store.selectedPosition = -1;

      // Change page.
      router.push(`/${board.join('-')}`);
    }
  }
});
</script>

<template>
  <table class="ui single line celled table">
    <tbody>
      <tr v-for="i in [0, 3, 6]">
        <td
          v-for="j in [0, 1, 2]"
          :class="{ positive: store.winningPositions.includes(i + j), negative: store.state === 'DRAW' }"
        >
          <button
            :class="{
              'ui massive basic fluid icon button': true,
              loading: store.selectedPosition === i + j,
              disabled: ['WIN_X', 'WIN_O', 'DRAW'].includes(store.state) || store.selectedPosition >= 0,
              positive: store.winningPositions.includes(i + j),
              negative: store.state === 'DRAW',
            }"
            @mouseover="store.hoveredPosition = i + j"
            @mouseout="store.hoveredPosition = -1"
            @click="submitMove(i + j)"
          >
            <i v-if="store.board[i + j] === 1" class="x icon"></i>
            <i v-else-if="store.board[i + j] === 2" class="circle outline icon"></i>
            <i
              v-else
              :class="{
                icon: true,
                x: store.hoveredPosition === i + j && store.currentPlayer === 1,
                'circle outline': store.hoveredPosition === i + j && store.currentPlayer === 2,
              }"
            >
              <span>{{ i + j }}</span>
            </i>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
i.icon > span {
  font-family: sans-serif;
  color: lightgray;
}

i.icon.circle.outline > span {
  display: none;
}

i.icon.x > span {
  display: none;
}

.ui.disabled.button.positive {
  opacity: 1 !important;
}

@media screen and (min-width: 1024px) {
  .ui.massive.button {
    font-size: 3rem;
  }
}

@media screen and (max-width: 1024px) {
  .ui.massive.button {
    font-size: 2rem;
  }
}
</style>
