import { ref } from 'vue';

/**
 * @typedef panels
 * @property {baselayer} boolean
 * @property {tools} boolean
 * @property {themen} boolean
 * @property {schlag} boolean
 * @property {search} boolean
*/

const panels = ref({
  baselayer: false, tools: false, themen: true, schlag: true, search: false,
});

/**
 * @returns {{
 *   panels: import('vue').Ref<panels>,
 * }}
 */
export function usePanelControl() {
  return { panels };
}
