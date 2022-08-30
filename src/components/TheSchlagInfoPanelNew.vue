<template>
  <v-btn
    v-if="!panels.schlag || panels.baselayer || panels.tools"
    class="layerSwitcherButton pa-2"
    size="30"
    @click="panels.schlag = !panels.schlag"
  >
    <v-icon
      size="24"
      color="grey-darken-2"
    >
      mdi-information
    </v-icon>
  </v-btn>

  <v-card
    v-if="panels.schlag && !panels.baselayer && !panels.tools"
    class="layerSwitcherButton"
    width="440px"
    height="105px"
  >
    <v-row
      no-gutters
      class="boxHeader"
    >
      <v-col class="text-button text-white">
        <v-icon class="mx-1">
          mdi-information
        </v-icon>
        Schlag-Informationen:
      </v-col>
      <v-col
        cols="2"
        align="right"
      >
        <v-icon
          color="white"
          class="mr-1 mb-1"
          @click="panels.schlag = !panels.schlag"
        >
          mdi-close-box
        </v-icon>
      </v-col>
    </v-row>

    <v-row
      v-if="schlagInfo && !schlagInfo.loading"
      no-gutters
      class="text-body-2"
    >
      <v-col
        class="pa-2 pb-1"
        cols="3"
      >
        Nutzung:
      </v-col>
      <v-col
        class="pa-2 pb-1"
        cols="9"
      >
        {{ schlagInfo.snar_bezeichnung }}
      </v-col>
      <v-col
        class="px-2"
        cols="3"
      >
        Fläche:
      </v-col>
      <v-col
        class="px-2"
        cols="9"
      >
        {{ schlagInfo.sl_flaeche_brutto_ha.toLocaleString('de-AT', {maximumFractionDigits: 2}) }} ha
      </v-col>
    </v-row>
    <v-row
      v-else-if="mapView.zoom < 12"
      no-gutters
      class="pa-2 text-body-2"
    >
      Verwenden Sie die Suche oder klicken Sie in die Karte, um Schläge anzuzeigen.
    </v-row>
    <v-row
      v-else
      no-gutters
      class="pa-2 text-body-2"
    >
      Klicken Sie auf einen Schlag, um Informationen zu erhalten.
    </v-row>
  </v-card>
</template>

<script setup>
import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSchlag } from '../composables/useSchlag';
import { useMap } from '../composables/useMap';
import { panelControl } from '../composables/panelControl';

const { panels } = panelControl();
const { schlagInfo } = useSchlag();
const { map, mapView } = useMap();
const route = useRoute();
const router = useRouter();

const emit = defineEmits(['schlag']);

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
  }
  if (value && !value.loading) {
    emit('schlag', true);
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
  .layerSwitcherButton {
    position: absolute;
    left: 10px;
    top: 60px;
  }

  .boxHeader .v-col {
    height: 30px;
    line-height: 30px;
    background-color: #777;
  }

</style>
