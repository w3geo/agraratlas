import { ref } from 'vue';

/**
 * @typedef panels
 * @property {baselayer} boolean
 * @property {tools} boolean
 * @property {themen} boolean
 * @property {schlag} boolean
*/

const panels = ref({
  baselayer: false, tools: false, themen: true, schlag: true,
});

/**
 * @returns {{
 *   panels: import('vue').Ref<panels>,
 * }}
 */
export function usePanelControl() {
  return { panels };
}
