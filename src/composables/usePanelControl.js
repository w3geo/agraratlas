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

function closeOthers(except, ismobile) {
  if (ismobile) {
    Object.keys(panels.value).forEach((key) => {
      if (key !== except) {
        panels.value[key] = false;
      }
    });
  }
}

/**
 * @returns {{
 *   panels: import('vue').Ref<panels>,
 * }}
 */
export function usePanelControl() {
  return { panels, closeOthers };
}
