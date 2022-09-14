import { defineStore } from 'pinia';

export const useInterfaceStore = defineStore('interface', {
  state: () => ({
    expression: '50 * 40 + 30 * 20',
    isAwaitingGraph: false,
    selectedTaskId: null,
  }),
});
