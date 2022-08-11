<template>
  <v-expansion-panel>
    <v-expansion-panel-title>
      Karte und Werkzeuge
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      Grundkarte
      <v-switch
        v-for="(layer, index) in baseLayers"
        :key="index"
        v-model="baseLayer"
        :label="layer"
        :value="layer"
        hide-details
        density="compact"
      />
      <v-toolbar dense>
        <v-icon
          class="mr-2"
          icon="mdi-file"
        />
        <v-toolbar-title>GeoJSON</v-toolbar-title>
        <v-btn-group class="mr-10">
          <v-btn
            width="100"
            @click="importJson()"
          >
            Import
          </v-btn>
          <v-btn
            width="100"
            @click="exportJson()"
          >
            Export
          </v-btn>
        </v-btn-group>
      </v-toolbar>
      <v-toolbar dense>
        <v-icon
          class="mr-2"
          icon="mdi-brush"
        />
        <v-toolbar-title>
          Zeichnen
        </v-toolbar-title>

        <v-btn-toggle v-model="draw">
          <v-btn
            width="100"
            value="LineString"
          >
            Linie
          </v-btn>
          <v-btn
            width="100"
            value="Point"
          >
            Text
          </v-btn>
        </v-btn-toggle>
        <v-btn
          class="ml-2"
          icon
          @click="clearDraw()"
        >
          <v-icon icon="mdi-delete" />
        </v-btn>
      </v-toolbar>
      <v-toolbar dense>
        <v-icon
          class="mr-2"
          icon="mdi-ruler"
        />
        <v-toolbar-title>
          Messen
        </v-toolbar-title>

        <v-btn-toggle v-model="measure">
          <v-btn
            width="100"
            value="Polygon"
          >
            Fläche
          </v-btn>
          <v-btn
            width="100"
            value="LineString"
          >
            Distanz
          </v-btn>
        </v-btn-toggle>
        <v-btn
          class="ml-2"
          icon
          @click="clearMeasure()"
        >
          <v-icon icon="mdi-delete" />
        </v-btn>
      </v-toolbar>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<script setup>
import { useLayers } from '../composables/useLayers';
import { useTools } from '../composables/useTools';

const { baseLayers, baseLayer } = useLayers();
const {
  draw, clearDraw, measure, clearMeasure, importJson, exportJson,
} = useTools();

</script>
