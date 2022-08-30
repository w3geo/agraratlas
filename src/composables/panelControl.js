import { ref } from 'vue';

/**
 * @typedef SchlagInfo
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
 *   schlagInfo: import('vue').Ref<SchlagInfo>,
 *   availableLayersOfInterest: import('vue').Ref<Array<string>>,
 *   layersOfInterest: import('vue').Ref<Array<string>>
 * }}
 */
export function panelControl() {
  return { panels };
}
