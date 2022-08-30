<template>
  <v-btn
    v-if="!panels.themen || panels.baselayer || panels.tools"
    class="layerSwitcherButton pa-2"
    size="30"
    @click="panels.themen = !panels.themen"
  >
    <v-icon
      size="24"
      color="grey-darken-2"
    >
      mdi-view-list
    </v-icon>
  </v-btn>

  <v-card
    v-if="panels.themen && !panels.baselayer && !panels.tools"
    class="layerSwitcherButton"
    width="440px"
    height="calc(100vh - 350px)"
  >
    <v-row
      no-gutters
      class="boxHeader"
    >
      <v-col class="text-button text-white">
        <v-icon class="mx-1">
          mdi-view-list
        </v-icon>
        Themen / Hangneigungen:
      </v-col>
      <v-col
        cols="2"
        align="right"
      >
        <v-icon
          color="white"
          class="mr-1 mb-1"
          @click="panels.themen = !panels.themen"
        >
          mdi-close-box
        </v-icon>
      </v-col>
    </v-row>

    <v-tabs
      v-model="tab"
      grow
      class="allTabs"
      background-color="#f6f6f6"
    >
      <v-tab
        value="themen"
        height="40"
        class="tabInActive"
        selected-class="tabActive left"
      >
        Themen
      </v-tab>
      <v-tab
        value="neigungen"
        height="40"
        class="tabInActive"
        selected-class="tabActive right"
      >
        Hangneigungen
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="themen">
        <div class="pa-2 scrollDiv">
          <v-radio-group
            v-model="selectedTopic"
          >
            <v-radio
              key="-2"
              label="Nur Hintergrundkarte"
              value="none"
              density="compact"
            />
            <v-radio
              key="-1"
              label="Übersicht aller Themen"
              value="any"
              density="compact"
              class="lineBelow"
            />
            <template v-for="(topic, index) in topics">
              <v-radio
                v-if="!onlyTopicsInExtent ||
                  (schlagInfo ? topic.inSchlagExtent : topic.inExtent) || topic.visible"
                :key="index"
                :label="topic.label"
                :value="topic.label"
                hide-details
                density="compact"
                :class="{fat : schlagInfo && topic.inSchlagExtent}"
              />
            </template>
          </v-radio-group>
        </div>
        <div
          class="topicFilter px-2"
        >
          <v-checkbox
            v-model="onlyTopicsInExtent"
            density="compact"
            hide-details
            :label="filterSwitchLabel"
          />
        </div>
      </v-window-item>
      <v-window-item value="neigungen">
        <div class="scrollDivLarger">
          <v-row
            no-gutters
            class="text-body-2 font-weight-bold lineBelow mt-3"
          >
            <v-col
              cols="2"
              class="pa-2"
            />
            <v-col
              cols="6"
              class="pa-2"
            >
              Hangneigung
            </v-col>
            <v-col
              cols="4"
              class="pa-2"
            >
              <span v-if="schlagInfo && !schlagInfo.loading">Anteil/Schlag</span>
            </v-col>
          </v-row>
          <v-row
            v-for="(value, key) in aspects"
            :key="key"
            no-gutters
          >
            <v-col
              cols="2"
              class="px-2 pt-1"
            >
              <v-checkbox
                v-model="value.visible"
                class="denseBox"
                :disabled="mapView.zoom < 9"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col
              cols="6"
              class="pa-1 pt-2 text-body-2"
            >
              {{ value.label }}
            </v-col>
            <v-col
              cols="4"
              class="pa-1 pt-2 text-body-2"
            >
              <span v-if="schlagInfo && !schlagInfo.loading">
                {{ value.inSchlag
                  ? value.fraction < 0.005 ? '< 0,5%' : Math.round(value.fraction * 100) + '%'
                  : '-' }}</span>
            </v-col>
          </v-row>
        </div>
      </v-window-item>
    </v-window>
    <v-row
      no-gutters
      class="pa-2 lineAbove"
    >
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
    </v-row>
  </v-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useLayers } from '../composables/useLayers';
import { useSchlag } from '../composables/useSchlag';
import { useTopics } from '../composables/useTopics';
import { panelControl } from '../composables/panelControl';
import { useAspect } from '../composables/useAspect';
import { mapView } from '../composables/useMap';

const { panels } = panelControl();
const { topics } = useTopics();
const { opacity, showOverview } = useLayers();
const { schlagInfo } = useSchlag();
const { aspects } = useAspect();

/** @type {import("vue").Ref<string>} */
const selectedTopic = ref('any');
/** @type {import("vue").Ref<boolean>} */
const onlyTopicsInExtent = ref(false);

const tab = ref();

const filterSwitchLabel = computed(() => (schlagInfo.value
  ? 'Nur für den gewählten Schlag mögliche Themen'
  : 'Nur im Kartenausschnitt sichtbare Themen'));

watch(selectedTopic, (value) => {
  showOverview.value = value === 'any';
  topics.forEach((topic) => {
    topic.visible = topic.label === value;
  });
});

</script>

<style scoped>
  .layerSwitcherButton {
    position: absolute;
    left: 10px;
    top: 180px;
  }

  .boxHeader .v-col {
    height: 30px;
    line-height: 30px;
    background-color: #777;
  }

  .allTabs {
    height: 40px!important;
  }

  .tabInActive {
    border-bottom: 1px solid #666;
  }
.tabActive {
  border-top: 1px solid #666;
  border-bottom: none;
  background-color: white;
}

.tabActive.left {
  border-right: 1px solid #666;
  border-top-right-radius: 8px!important;
}
.tabActive.right {
  border-left: 1px solid #666;
  border-top-left-radius: 8px!important;
}

.lineBelow {
  border-bottom: 1px solid #ddd;
}
.lineAbove {
  border-top: 1px solid #ddd;
  background-color: #f6f6f6;
}

</style>

<style>
  /* only work if not scoped */
  .topicFilter {
    border-top: 1px solid #ddd;
    background-color: #f6f6f6;
  }

  .scrollDiv {
    height: calc(100vh - 505px);
    overflow: auto;
  }

  .scrollDivLarger {
    height: calc(100vh - 464px);
    overflow: auto;
  }

  .scrollDiv .mdi-radiobox-blank, .scrollDiv .mdi-radiobox-marked {
    font-size: 15px!important;
  }

  .scrollDiv .v-label, .topicFilter .v-label, .topicFilter input {
    font-size: 15px!important;
  }

  .scrollDiv .v-selection-control.fat .v-label {
    font-weight: bold;
    color: #000;
  }

  .v-checkbox.denseBox .v-selection-control {
    height: auto!important;
  }

</style>
