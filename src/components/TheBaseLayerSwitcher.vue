<template>
  <v-btn
    v-if="!panels.baselayer"
    class="layerSwitcherButton pa-2"
    size="30"
    @click="panels.baselayer = !panels.baselayer"
  >
    <v-icon
      size="24"
      color="grey-darken-2"
    >
      mdi-layers
    </v-icon>
  </v-btn>
  <v-card
    v-if="panels.baselayer"
    class="layerSwitcherButton"
    width="320px"
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
        cols="4"
        align="center"
        class="mapMode pa-2"
        :class="{selected : mapMode=='auto'}"
        @click="switchMode('auto')"
      >
        <v-img
          :src="auto"
          contain
          class="mb-1"
        /><div class="text-caption">
          Automatisch
        </div>
      </v-col>
      <v-col
        cols="4"
        align="center"
        class="mapMode pa-2"
        :class="{selected : mapMode=='topo'}"
        @click="switchMode('topo')"
      >
        <v-img
          :src="topo"
          contain
          class="mb-1"
        /><div class="text-caption">
          Übersicht
        </div>
      </v-col>
      <v-col
        cols="4"
        align="center"
        class="mapMode pa-2"
        :class="{selected : mapMode=='ortho'}"
        @click="switchMode('ortho')"
      >
        <v-img
          :src="ortho"
          contain
          class="mb-1"
        /><div class="text-caption">
          Luftbild
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import auto from '../assets/auto.jpg';
import topo from '../assets/topo.jpg';
import ortho from '../assets/ortho.jpg';
import { panelControl } from '../composables/panelControl';

const mapMode = ref('auto');

const { panels } = panelControl();

function switchMode(newMode) {
  mapMode.value = newMode;
}
</script>

<style scoped>
  .layerSwitcherButton {
    position: absolute;
    left: 10px;
    bottom: 50px;
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
    opacity: .7;
  }
  .mapMode.selected .v-img {
    border: 1px solid #333;
    opacity: 1;
  }
</style>
