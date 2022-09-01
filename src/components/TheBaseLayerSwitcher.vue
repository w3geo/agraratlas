<template>
  <v-btn
    v-if="!panels.baselayer"
    class="layerSwitcherButton pa-2"
    :class="{mobile : mobile}"
    size="mobile ? 20 : 30"
    @click="panels.baselayer = !panels.baselayer"
  >
    <v-icon
      :size="mobile ? 18 : 24"
      color="grey-darken-2"
    >
      mdi-layers
    </v-icon>
  </v-btn>
  <v-card
    v-if="panels.baselayer"
    class="layerSwitcherButton lower"
    width="260px"
    height="155px"
  >
    <v-row
      no-gutters
      class="boxHeader"
    >
      <v-col class="text-button text-white">
        <v-icon class="mx-1">
          mdi-layers
        </v-icon>
        BASISKARTE WÄHLEN:
      </v-col>
      <v-col
        cols="2"
        align="right"
      >
        <v-icon
          color="white"
          class="mr-1 mb-1"
          @click="panels.baselayer = !panels.baselayer"
        >
          mdi-close-box
        </v-icon>
      </v-col>
    </v-row>
    <v-row no-gutters>
      <v-col
        cols="6"
        align="center"
        class="mapMode pa-2"
        :class="{selected : baseLayer=='Übersichtskarte'}"
        @click="switchMode('Übersichtskarte')"
      >
        <v-img
          :src="topo"
          contain
          width="90"
          height="90"
          class="mb-1"
        /><div class="text-caption">
          <span>Übersichtskarte</span>
        </div>
      </v-col>
      <v-col
        cols="6"
        align="center"
        class="mapMode pa-2"
        :class="{selected : baseLayer=='Orthofoto'}"
        @click="switchMode('Orthofoto')"
      >
        <v-img
          :src="ortho"
          contain
          width="90"
          height="90"
          class="mb-1"
        /><div class="text-caption">
          <span>Orthofoto</span>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import topo from '../assets/topo.jpg';
import ortho from '../assets/ortho.jpg';
import { usePanelControl } from '../composables/usePanelControl';
import { useLayers } from '../composables/useLayers';

const { baseLayer } = useLayers();
const { width, height } = useDisplay();
const { panels } = usePanelControl();

const mobile = computed(() => (width.value < 800 || height.value < 520));
watch(mobile, (newvalue, oldvalue) => {
  if (!oldvalue && newvalue && panels.value.baselayer) {
    panels.value.baselayer = false;
  }
});

function switchMode(newMode) {
  baseLayer.value = newMode;
}
</script>

<style scoped>
  .layerSwitcherButton {
    position: absolute;
    left: 10px;
    bottom: 50px;
  }

  .layerSwitcherButton.lower {
    bottom: 10px;
  }

  .layerSwitcherButton.lower.mobile, .layerSwitcherButton.mobile  {
    position: absolute;
    left: auto;
    bottom: auto;
    right: 62px;
    top: 6px;
    z-index: 5000;
  }

  .boxHeader .v-col {
    height: 30px;
    line-height: 30px;
    background-color: #777;
  }

  .mapMode {
    cursor: pointer;
  }

  .mapMode .v-img {
    border: 1px solid #fff;
    opacity: .5;
  }
  .mapMode.selected .v-img {
    border: 1px solid #333;
    opacity: 1;
  }

  .mapMode.selected span {
    font-weight: bold;
  }

</style>
