import { computed } from 'vue';

const width = window.innerWidth;
const height = window.innerHeight;

const mobile = computed(() => (width.value < 800 || height.value < 520));
const lowvertical = computed(() => (height.value < 740));

export function useMyDisplay() {
  return { mobile, lowvertical };
}
