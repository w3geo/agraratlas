<template>
  <v-btn
    v-if="minimized"
    class="layerSwitcherButton pa-2"
    size="30"
    @click="minimized = !minimized"
  >
    <v-icon
      size="24"
      color="grey-darken-2"
    >
      mdi-hammer-wrench
    </v-icon>
  </v-btn>

  <v-card
    v-if="!minimized"
    class="layerSwitcherButton"
    width="440px"
    height="160px"
  >
    <v-row
      no-gutters
      class="boxHeader"
    >
      <v-col class="text-button text-white">
        <v-icon class="mx-1">
          mdi-hammer-wrench
        </v-icon>
        Werkzeuge:
      </v-col>
      <v-col
        cols="2"
        align="right"
      >
        <v-icon
          color="white"
          class="mr-1 mb-1"
          @click="minimized = !minimized, draw = ''"
        >
          mdi-close-box
        </v-icon>
      </v-col>
    </v-row>
    <v-row no-gutters>
      <v-col
        cols="4"
        class="pa-2"
      >
        <v-icon
          class="mr-2"
          icon="mdi-cloud-braces"
        />
        GeoJSON
      </v-col>
      <v-col
        cols="3"
        class="pa-2"
      >
        <v-btn
          block
          elevation="1"
          density="compact"
          @click="importJson()"
        >
          Import
        </v-btn>
      </v-col>
      <v-col
        cols="3"
        class="pa-2"
      >
        <v-btn
          block
          elevation="1"
          density="compact"
          @click="exportJson()"
        >
          Export
        </v-btn>
      </v-col><v-col cols="2" />
    </v-row>
    <v-row no-gutters>
      <v-col
        cols="4"
        class="pa-2"
      >
        <v-icon
          class="mr-2"
          icon="mdi-brush"
        />
        Zeichnen
      </v-col>
      <v-col
        cols="3"
        class="pa-2"
      >
        <v-btn
          block
          :color="draw == 'LineString' ? 'black' : 'white'"
          elevation="1"
          density="compact"
          @click="draw = ((draw == 'LineString') ? '' : 'LineString')"
        >
          Linie
        </v-btn>
      </v-col>
      <v-col
        cols="3"
        class="pa-2"
      >
        <v-btn
          block
          :color="draw == 'Point' ? 'black' : 'white'"
          elevation="1"
          density="compact"
          @click="draw = ((draw == 'Point') ? '' : 'Point')"
        >
          Text
        </v-btn>
      </v-col><v-col
        cols="2"
        class="pa-2"
        align="right"
      >
        <v-icon
          icon="mdi-delete"
          @click="clearDraw()"
        />
      </v-col>
    </v-row>

    <v-row no-gutters>
      <v-col
        cols="4"
        class="pa-2"
      >
        <v-icon
          class="mr-2"
          icon="mdi-ruler-square"
        />
        Messen
      </v-col>
      <v-col
        cols="3"
        class="pa-2"
      >
        <v-btn
          block
          :color="measure == 'LineString' ? 'black' : 'white'"
          elevation="1"
          density="compact"
          @click="measure = ((measure == 'LineString') ? '' : 'LineString')"
        >
          Strecke
        </v-btn>
      </v-col>
      <v-col
        cols="3"
        class="pa-2"
      >
        <v-btn
          block
          :color="measure == 'Polygon' ? 'black' : 'white'"
          elevation="1"
          density="compact"
          @click="measure = ((measure == 'Polygon') ? '' : 'Polygon')"
        >
          Fläche
        </v-btn>
      </v-col><v-col
        cols="2"
        class="pa-2"
        align="right"
      >
        <v-icon
          icon="mdi-delete"
          @click="clearMeasure()"
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { useTools } from '../composables/useTools';

const {
  draw, clearDraw, measure, clearMeasure, importJson, exportJson,
} = useTools();

const minimized = ref(true);

</script>

<style scoped>
  .layerSwitcherButton {
    position: absolute;
    left: 10px;
    bottom: 110px;
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
