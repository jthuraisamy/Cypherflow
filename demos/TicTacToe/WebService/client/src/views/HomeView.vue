<script setup lang="ts">
import Header from '../components/Header.vue';
import Board from '../components/Board.vue';
import Recommendations from '@/components/Recommendations.vue';
import Status from '@/components/Status.vue';
import { useGameStore } from '@/stores/game';

const store = useGameStore();
</script>

<template>
  <div class="ui container">
    <div class="ui grid">
      <div class="row">
        <div class="column">
          <Header />
        </div>
      </div>
      <div class="two column centered row">
        <div class="column">
          <Board />
        </div>
        <div class="column">
          <Status />
          <Recommendations v-if="store.currentPlayer > 0" />
          <router-link v-else to="/" class="ui massive fluid primary button">New Game</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
