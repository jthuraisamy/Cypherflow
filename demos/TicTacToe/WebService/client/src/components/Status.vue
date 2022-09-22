<script setup lang="ts">
import { useGameStore } from '@/stores/game';

const store = useGameStore();
</script>

<template>
  <div class="ui large floating message">
    <h3 class="ui header">Game Information</h3>
    <table class="ui celled compact small table">
      <tbody>
        <tr>
          <td class="two wide">State</td>
          <td>
            <code>{{ store.state }}</code>
          </td>
        </tr>
        <tr>
          <td>Turn</td>
          <td>
            <code>{{ store.currentPlayerName }}</code>
          </td>
        </tr>
        <tr>
          <td>Path</td>
          <td>
            {{ store.path.join(' ➔ ') }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.trajectory {
  color: darkgrey;
}
</style>
