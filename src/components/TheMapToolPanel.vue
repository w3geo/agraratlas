<template>
  <v-btn
    v-if="!panels.tools || mobile"
    class="layerSwitcherButton pa-2"
    :class="{baseShow : panels.baselayer, mobile : mobile}"
    size="mobile ? 20 : 30"
    @click="panels.tools = !panels.tools, closeOthers('tools', mobile)"
  >
    <v-icon
      :size="mobile ? 18 : 24"
      color="grey-darken-2"
    >
      mdi-hammer-wrench
    </v-icon>
  </v-btn>

  <v-card
    v-if="panels.tools"
    class="layerSwitcherButton"
    :class="{baseShow : panels.baselayer, mobilepanel : mobile}"
    :width="mobile ? '100%' : '440px'"
    :height="`${160 + (elevationProfile ? 120 : 0)}px`"
  >
    <v-row
      no-gutters
      class="boxHeader"
    >
      <v-col class="text-button text-white">
        <v-icon class="mx-1">
          mdi-hammer-wrench
        </v-icon>
        Werkzeuge
      </v-col>
      <v-col
        cols="2"
        align="right"
      >
        <v-icon
          color="white"
          class="mr-1 mb-1"
          @click="panels.tools = !panels.tools, draw = ''"
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
        class="pr-1 pt-2"
        align="right"
      >
        <v-btn
          variant="plain"
          density="compact"
          title="Löschen"
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
        class="pr-1 pt-2"
        align="right"
      >
        <v-btn
          variant="plain"
          density="compact"
          title="Höhenprofil"
          icon="mdi-elevation-rise"
          :disabled="!elevationProfilePossible"
          @click="renderElevationProfile()"
        />
        <v-btn
          variant="plain"
          density="compact"
          title="Löschen"
          icon="mdi-delete"
          @click="clearMeasure()"
        />
      </v-col>
    </v-row>
    <v-row
      no-gutters
      class="pl-2"
    >
      <svg
        v-if="elevationProfile"
        class="elevation-profile"
      />
    </v-row>
  </v-card>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useTools } from '../composables/useTools';
import { usePanelControl } from '../composables/usePanelControl';

const { width, height } = useDisplay();
const { panels, closeOthers } = usePanelControl();

const mobile = computed(() => (width.value < 800 || height.value < 520));
watch(mobile, (newvalue, oldvalue) => {
  if (!oldvalue && newvalue && panels.value.tools) {
    panels.value.tools = false;
  }
});

const {
  draw, clearDraw, measure, clearMeasure, elevationProfilePossible, elevationProfile,
  renderElevationProfile, importJson, exportJson,
} = useTools();

</script>

<style scoped>
  .layerSwitcherButton {
    position: absolute;
    left: 10px;
    bottom: 100px;
  }

  .layerSwitcherButton.baseShow {
    bottom: 170px;
  }

  .layerSwitcherButton.baseShow.mobile, .layerSwitcherButton.mobile  {
    position: absolute;
    left: auto;
    bottom: auto;
    right: 104px;
    top: 6px;
    z-index: 5000;
  }

  .layerSwitcherButton.baseShow.mobilepanel, .layerSwitcherButton.mobilepanel  {
    left: 0px;
    top: 50px;
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

  .elevation-profile {
    width: 100%;
    height: 120px;
  }
</style>
