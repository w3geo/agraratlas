<template>
  <v-expansion-panel
    value="schlag"
  >
    <v-expansion-panel-title>
      Schlag Informationen <v-spacer /><v-btn
        v-if="canCenter"
        icon
        flat
        rounded
        size="x-small"
        color="transparent"
        title="Auf Schlag zoomen"
        @click.stop="center"
      >
        <v-icon
          icon="mdi-crosshairs"
        />
      </v-btn>
    </v-expansion-panel-title>
    <v-expansion-panel-text v-if="schlagInfo && !schlagInfo.loading">
      <div>Fläche: {{ schlagInfo.sl_flaeche_brutto_ha.toFixed(2) }} ha</div>
      <div class="pb-2">
        {{ schlagInfo.snar_bezeichnung }}
      </div>
      <v-tabs
        v-model="tab"
        fixed-tabs
        density="compact"
      >
        <v-tab
          value="topics"
        >
          Mögliche Themen
        </v-tab>
        <v-tab
          value="aspect"
        >
          Hangneigung
        </v-tab>
      </v-tabs>
      <v-window v-model="tab">
        <v-window-item
          class="pa-2"
          value="topics"
        >
          <v-switch
            v-for="(layer, index) in layersOfInterest"
            :key="index"
            v-model="layerOfInterest"
            :label="layer"
            :value="layer"
            hide-details
            density="compact"
          />
        </v-window-item>
        <v-window-item
          class="pa-2"
          value="aspect"
        >
          <v-switch
            v-for="(value, layer, index) in aspectClasses"
            :key="index"
            v-model="layerOfInterest"
            :label="layer + ' (' + value.toFixed(2) + ' ha)'"
            :value="layer"
            hide-details
            density="compact"
          />
        </v-window-item>
      </v-window>
      <v-slider
        v-model="opacity"
        class="ma-0"
        prepend-icon="mdi-opacity"
        :max="1"
        :min="0"
        :step="0.1"
        thumb-color="white"
        color="gray"
        hide-details
        density="compact"
        title="Deckkraft"
      />
    </v-expansion-panel-text>
    <v-expansion-panel-text v-else-if="mapView.zoom < 12">
      Verwenden Sie die Suche oder klicken Sie in die Karte, um Schläge anzuzeigen.
    </v-expansion-panel-text>
    <v-expansion-panel-text v-else>
      Klicken Sie auf einen Schlag, um Informationen zu erhalten.
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCenter } from 'ol/extent';
import { equals } from 'ol/coordinate';
import { useSchlag } from '../composables/useSchlag';
import { useAspect } from '../composables/useAspect';
import { useMap } from '../composables/useMap';
import { useLayers } from '../composables/useLayers';

const { schlagInfo, layersOfInterest, layerOfInterest } = useSchlag();
const { opacity } = useLayers();
const { aspectClasses } = useAspect();
const { map, mapView } = useMap();
const route = useRoute();
const router = useRouter();
const details = ref();
const tab = ref('topics');

const canCenter = computed(() => schlagInfo.value?.extent && (!equals(
  getCenter(schlagInfo.value.extent).map((v) => v.toFixed(4)),
  mapView.value.center.map((v) => v.toFixed(4)),
) || mapView.value.zoom < 12));

const emit = defineEmits(['schlag']);

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

/**
 * @param {import("ol/MapBrowserEvent.js").default} event
 */
function zoomTo12(event) {
  map.getView().animate({
    zoom: 12,
    center: event.coordinate,
    duration: 500,
  });
}

watch(schlagInfo, (value) => {
  if (value?.id !== Number(route.params.schlagId)) {
    router.push({ params: { schlagId: value?.id } });
    layerOfInterest.value = null;
    aspectClasses.value = null;
  }
  if (value && !value.loading) {
    emit('schlag', true);
  }
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
});

let zoomOnClick = false;
watch(mapView, (value) => {
  if (!zoomOnClick && value.zoom < 12) {
    zoomOnClick = true;
    map.once('click', zoomTo12);
  } else {
    zoomOnClick = false;
    map.un('click', zoomTo12);
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
