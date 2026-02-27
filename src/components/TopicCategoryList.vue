<template>
  <div
    class="pa-2 scrollDiv"
    :style="scrollStyle"
  >
    <template
      v-for="(category, key) in topicsByCategory"
      :key="key"
    >
      <v-row no-gutters>
        <v-col
          cols="10"
          class="category pt-1"
        >
          {{ key }}
        </v-col>
      </v-row>
      <template
        v-for="(topic, index) in topicsByCategory[key]"
        :key="index"
      >
        <v-row
          no-gutters
        >
          <v-col cols="10">
            <v-checkbox
              v-model="topic.visible"
              :label="topic.label"
              hide-details
              density="compact"
            /><v-label
              v-if="topic.visible && topic.warning"
              class="pl-7 pb-1 topic-warning"
              :text="topic.warning"
            />
          </v-col><v-col
            cols="2"
            class="pa-1"
          >
            <div
              :class="topic.icon ? 'iconBox' : 'colorBox'"
              :style="'background-color: ' + topic.color +'; opacity: ' + opacity + ';'"
            />
          </v-col>
        </v-row>
      </template>
    </template>
  </div>
  <div
    class="topicFilter px-2"
  >
    <v-checkbox
      :model-value="onlyInSchlagExtent"
      density="compact"
      hide-details
      label="Nur für den gewählten Schlag interessante Kategorien"
      :disabled="!schlagInfo"
      @update:model-value="$emit('update:onlyInSchlagExtent', $event)"
    />
  </div>
</template>

<script setup>
defineProps({
  topicsByCategory: {
    type: Object,
    required: true,
  },
  opacity: {
    type: Number,
    required: true,
  },
  scrollStyle: {
    type: String,
    required: true,
  },
  schlagInfo: {
    type: [Object, null],
    default: null,
  },
  onlyInSchlagExtent: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:onlyInSchlagExtent']);
</script>

<style scoped>
.category {
  font-weight: bold;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.87);
}

.colorBox {
  border: 1px solid #666;
  width: 18px;
  height: 18px;
}
.iconBox {
  border: 2px solid black;
  width: 14px;
  height: 14px;
  margin: 2px;
}
</style>
