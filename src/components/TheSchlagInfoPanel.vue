<template>
  <v-expansion-panel
    value="schlag"
  >
    <v-expansion-panel-title>
      Schlag Informationen <v-spacer /><v-btn
        v-if="canCenter"
        flat
        rounded
        size="x-small"
        icon="mdi-crosshairs"
        color="transparent"
        title="Zentrieren"
        @click.stop="center"
      />
    </v-expansion-panel-title>
    <v-expansion-panel-text v-if="schlagInfo && !schlagInfo.loading">
      <div>Fläche: {{ schlagInfo.sl_flaeche_brutto_ha.toFixed(2) }} ha</div>
      <div>{{ schlagInfo.snar_bezeichnung }}</div>
      <!-- v-treeview is not yet available in Vuetify for Vue3 -->
      <div ref="details">
        <details
          v-if="layersOfInterest?.length"
          open
          class="details"
          @click="toggleDetails($event)"
        >
          <summary>Möglicherweise relevante Themen</summary>
          <v-switch
            v-for="(layer, index) in layersOfInterest"
            :key="index"
            v-model="layerOfInterest"
            :label="layer"
            :value="layer"
            hide-details
            density="compact"
          />
        </details>
        <details
          class="details"
          @click="toggleDetails($event)"
        >
          <summary>Hangneigung</summary>
          <v-switch
            v-for="(value, layer, index) in aspectClasses"
            :key="index"
            v-model="layerOfInterest"
            :label="layer + ' (' + value.toFixed(2) + ' ha)'"
            :value="layer"
            hide-details
            density="compact"
          />
        </details>
      </div>
    </v-expansion-panel-text>
    <v-expansion-panel-text v-else>
      Klicken Sie auf einen Schlag, um Informationen zu erhalten.
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCenter } from 'ol/extent';
import { equals } from 'ol/coordinate';
import { useSchlag } from '../composables/useSchlag';
import { useAspect } from '../composables/useAspect';
import { useMap } from '../composables/useMap';

const { schlagInfo, layersOfInterest, layerOfInterest } = useSchlag();
const { aspectClasses } = useAspect();
const { map } = useMap();
const route = useRoute();
const router = useRouter();
const canCenter = ref(false);
const details = ref();
const emit = defineEmits(['schlag']);

function toggleDetails(event) {
  if (!event.target.parentNode.open) {
    const panels = details.value.querySelectorAll('details');
    panels.forEach((panel) => {
      if (panel !== event.target.parentNode) {
        panel.removeAttribute('open');
      }
    });
  }
}

function calculateCanCenter() {
  canCenter.value = schlagInfo.value?.extent && !equals(
    getCenter(schlagInfo.value.extent).map((v) => v.toFixed(4)),
    map.getView().getCenter().map((v) => v.toFixed(4)),
  );
}

watch(schlagInfo, (value) => {
  if (details.value && value && !value.loading) {
    const panels = details.value.querySelectorAll('details');
    panels.forEach((panel, i) => {
      if (i === panels.length - 2) {
        panel.setAttribute('open', '');
      } else {
        panel.removeAttribute('open');
      }
    });
  }
  calculateCanCenter();
});
map.on('moveend', calculateCanCenter);

function center() {
  map.getView().fit(schlagInfo.value.extent, {
    maxZoom: 17,
    duration: 500,
    padding: [50, 50, 50, 50],
  });
}

function setSchlagId(id) {
  if (Number(id) !== schlagInfo.value?.id) {
    schlagInfo.value = id ? {
      loading: true,
      id: Number(id),
    } : null;
  }
}

watch(schlagInfo, (value) => {
  if (value?.id !== Number(route.params.schlagId)) {
    router.push({ params: { schlagId: value?.id } });
  }
  if (value && !value.loading) {
    emit('schlag', true);
  }
});

watch(() => route.params.schlagId, setSchlagId);
setSchlagId(route.params.schlagId);
</script>

<style scoped>
  .details {
    cursor: pointer;
  }
</style>