<template>
  <v-expansion-panel
    value="topic"
  >
    <v-expansion-panel-title>Themen</v-expansion-panel-title>
    <v-expansion-panel-text>
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
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useLayers } from '../composables/useLayers';
import { useSchlag } from '../composables/useSchlag';
import { useTopics } from '../composables/useTopics';

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
