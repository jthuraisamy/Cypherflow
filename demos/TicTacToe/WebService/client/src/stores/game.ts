import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', () => {
  const route = ref('0-0-0-0-0-0-0-0-0');

  const board = computed(() => route.value.split('-').map((p) => parseInt(p)));
  const state = ref('INITIALIZED');
  const winningPositions = ref([]);

  const path = ref([]);
  const recommendations = ref([]);

  let hoveredPosition = ref(-1);
  let selectedPosition = ref(-1);

  const uniqueRecommendations = computed(() => {
    let uniqueRecommendations = {};

    for (const moves of recommendations.value) {
      uniqueRecommendations[moves[0]] = moves;
    }

    return uniqueRecommendations;
  });

  const currentPlayer = computed(() => {
    let isOver = ['WIN_X', 'WIN_O', 'DRAW'].includes(state.value);
    let xMoves = board.value.filter((p) => p === 1).length;
    let oMoves = board.value.filter((p) => p === 2).length;

    return isOver ? 0 : oMoves >= xMoves ? 1 : 2;
  });

  const currentPlayerName = computed(() => {
    switch (currentPlayer.value) {
      case 1:
        return 'X';
      case 2:
        return 'O';
      default:
        return 'N/A';
    }
  });

  return {
    route,
    board,
    state,
    winningPositions,
    path,
    recommendations,
    uniqueRecommendations,
    hoveredPosition,
    selectedPosition,
    currentPlayer,
    currentPlayerName,
  };
});
