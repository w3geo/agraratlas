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
        Fachinformationen / Hangneigungen:
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

    <v-switch
      v-model="onlyTopicsInExtent"
      :label="filterSwitchLabel"
    />
    <v-radio-group v-model="selectedTopic">
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
        />
      </template>
    </v-radio-group>
  </v-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useLayers } from '../composables/useLayers';
import { useSchlag } from '../composables/useSchlag';
import { useTopics } from '../composables/useTopics';
import { panelControl } from '../composables/panelControl';

const { panels } = panelControl();
const { topics } = useTopics();
const { showOverview } = useLayers();
const { schlagInfo } = useSchlag();

/** @type {import("vue").Ref<string>} */
const selectedTopic = ref('any');
/** @type {import("vue").Ref<boolean>} */
const onlyTopicsInExtent = ref(true);

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

</style>
