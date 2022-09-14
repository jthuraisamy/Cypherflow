<template>
  <div class="ui container">
    <div class="ui form">
      <div class="fields">
        <div class="ten wide field">
          <div class="ui large input">
            <input id="prompt" type="text" v-focus v-model="interfaceStore.expression" @keyup.enter="submitExpression" />
          </div>
        </div>
        <div class="six wide field">
          <div class="ui two large buttons">
            <button :class="buttonClasses" @click="submitExpression">
              <i class="search icon"></i>
              Search
            </button>
            <button class="ui icon teal button" @click="randomExpression">
              <i class="random icon"></i>
              Random
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// @ts-nocheck

import { generateExpression } from "math-expression-generator";
import { mapStores } from "pinia";
import { useInterfaceStore } from "../stores/interface";
import SUBMIT_EXPRESSION from "../graphql/SubmitExpression.graphql";

export default {
  name: "SearchControls",

  props: ['graphId'],

  computed: {
    ...mapStores(useInterfaceStore),

    buttonClasses() {
      if (this.interfaceStore.isAwaitingGraph) {
        return 'ui primary button loading disabled';
      } else {
        return 'ui primary button';
      }
    }
  },

  methods: {
    randomExpression() {
      this.interfaceStore.expression = generateExpression({
        target: 42,
        length: Math.min(Math.floor(Math.random() * 10) + 2, 5)
      }).join(' ');

      this.submitExpression();
    },

    submitExpression() {
      this.interfaceStore.isAwaitingGraph = true;
      this.$apollo.mutate({
        mutation: SUBMIT_EXPRESSION,
        variables: { expression: this.interfaceStore.expression }
      });
    }
  }
}
</script>

<style scoped>
input#prompt {
  font-family: Consolas, monospace;
  font-weight: bold;
}
</style>
