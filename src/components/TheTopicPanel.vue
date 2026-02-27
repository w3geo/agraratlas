<template>
  <v-btn
    v-if="!panels.themen || mobile"
    class="topicPanelButton pa-2"
    :class="{noSchlag : !panels.schlag, mobile : mobile}"
    size="mobile ? 20 : 30"
    @click="panels.themen = !panels.themen, closeOthers('themen', mobile)"
  >
    <v-icon
      :size="mobile ? 18 : 24"
      color="grey-darken-2"
    >
      mdi-view-list
    </v-icon>
  </v-btn>

  <v-card
    v-if="panels.themen && !tooLow"
    class="topicPanelButton"
    :class="{noSchlag : !panels.schlag, mobilepanel : mobile}"
    :width="mobile ? '100%' : '440px'"
    :height="topicVcard"
  >
    <v-row
      no-gutters
      class="boxHeader"
    >
      <v-col class="text-button text-white">
        <v-icon class="mx-1">
          mdi-view-list
        </v-icon>
        Themen / Hangneigungen
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
        selected-class="tabActive middle"
      >
        Hangneigungen
      </v-tab>
      <!-- FinBod WZ2 https://colorbrewer2.org/?type=sequential&scheme=RdPu&n=6#type=sequential&scheme=RdPu&n=6 -->
      <v-tab
        value="finbod"
        height="40"
        class="tabInActive"
        selected-class="tabActive right"
      >
        FinBod W22
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="themen">
        <TopicCategoryList
          :topics-by-category="topicsByCategory"
          :opacity="opacity"
          :scroll-style="scrollDivCalc"
          :schlag-info="schlagInfo"
          v-model:only-in-schlag-extent="onlyTopicsInSchlagExtent"
        />
      </v-window-item>
      <v-window-item value="neigungen">
        <div
          class="scrollDiv"
          :style="scrollDivLargerCalc"
        >
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
              Hangneigungsklasse
            </v-col>
            <v-col
              cols="4"
              class="pa-2"
            >
              <span v-if="schlagInfo && !schlagInfo.loading">Anteil/Schlag</span>
            </v-col>
          </v-row>
          <v-row
            v-for="(gradient, key) in gradients"
            :key="key"
            no-gutters
          >
            <v-col
              cols="2"
              class="px-2 pt-1"
            >
              <v-checkbox
                v-model="gradient.visible"
                :disabled="mapView.zoom < 9"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col
              style="cursor: pointer"
              cols="4"
              class="pa-1 pt-2 text-body-2 gradientLabel"
              :class="{'selected' : schlagInfo && gradient.inSchlag,
                       'active' : gradient.visible,
                       'disabled': mapView.zoom < 9}"
              @click="gradient.visible = mapView.zoom < 9 ? gradient.visible : !gradient.visible"
            >
              {{ gradient.label }}
            </v-col>
            <v-col
              cols="2"
              class="pa-2"
            >
              <div
                class="colorBox"
                :style="'background-color: ' + gradient.color +'; opacity: ' + opacity + ';'"
              />
            </v-col>
            <v-col
              cols="4"
              class="pa-1 pt-2 text-body-2"
            >
              <span v-if="schlagInfo && !schlagInfo.loading">
                {{ gradient.inSchlag
                  ? gradient.fraction < 0.005 ? '< 0,5%' : Math.round(gradient.fraction * 100) + '%'
                  : '-' }}</span>
            </v-col>
          </v-row>
        </div>
      </v-window-item>
      <v-window-item value="finbod">
        <template v-if="mapView.zoom >= 15">
          <TopicCategoryList
            :topics-by-category="finbodByCategory"
            :opacity="opacity"
            :scroll-style="scrollDivCalc"
            :schlag-info="schlagInfo"
            v-model:only-in-schlag-extent="onlyTopicsInSchlagExtent"
          />
        </template>
        <template v-else>
          <div
            class="pa-4 text-center scrollDiv"
            :style="scrollDivCalc"
          >
            <p class="text-body-2 mb-3">
              Diese Information ist erst ab Zoomstufe 15 verfügbar.
            </p>
            <v-btn
              color="grey-darken-2"
              variant="outlined"
              size="small"
              @click="map.getView().animate({ zoom: 15, duration: 500 })"
            >
              Auf Zoomstufe 15 vergrößern
            </v-btn>
          </div>
          <div class="topicFilter px-2">
            <v-checkbox
              v-model="onlyTopicsInSchlagExtent"
              density="compact"
              hide-details
              label="Nur für den gewählten Schlag interessante Kategorien"
              :disabled="!schlagInfo"
            />
          </div>
        </template>
      </v-window-item>
    </v-window>
    <v-row
      no-gutters
      class="pa-2"
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
import { useDisplay } from 'vuetify';
import { useRoute, useRouter } from 'vue-router';
import TopicCategoryList from './TopicCategoryList.vue';
import { useLayers } from '../composables/useLayers';
import { useSchlag } from '../composables/useSchlag';
import { useTopics } from '../composables/useTopics';
import { usePanelControl } from '../composables/usePanelControl';
import { useGradient } from '../composables/useGradient';
import { useMap } from '../composables/useMap';
import { useTools } from '../composables/useTools';

const route = useRoute();
const router = useRouter();
const { panels, closeOthers } = usePanelControl();
const { map, mapView, mapReady } = useMap();
const { topics } = useTopics();
const { opacity } = useLayers();
const { schlagInfo } = useSchlag();
const { gradients } = useGradient();
const { elevationProfile } = useTools();

function urlSort(a, b) {
  return a.urlSort - b.urlSort;
}

/** @type {import("vue").Ref<boolean>} */
const onlyTopicsInSchlagExtent = ref(false);

function setVisible(value) {
  if (!value) {
    return;
  }
  const [topicsVisible, gradientsVisible] = value.split(',');
  topics.slice(0).sort(urlSort).forEach((topic, i) => {
    topic.visible = topicsVisible.charAt(i) === '1';
  });
  gradients.forEach((gradient, i) => {
    gradient.visible = gradientsVisible.charAt(i) === '1';
  });
}

const tab = ref();
const { width, height } = useDisplay();

function groupByCategory(categoryFilter) {
  return topics.filter(categoryFilter).reduce((acc, topic) => {
    const isRelevant = schlagInfo.value && onlyTopicsInSchlagExtent.value
      ? topic.inSchlagExtent
      : topic.inExtent;
    if (isRelevant || topic.visible) {
      if (!acc[topic.category]) {
        acc[topic.category] = [];
      }
      acc[topic.category].push(topic);
    }
    return acc;
  }, {});
}

const finbodByCategory = computed(() => groupByCategory((t) => t.category === 'FinBod W22'));

const topicsByCategory = computed(() => groupByCategory((t) => t.category !== 'FinBod W22'));

const mobile = computed(() => (width.value < 800 || height.value < 520));
panels.value.themen = !mobile.value;

watch(mobile, (newvalue, oldvalue) => {
  if (!oldvalue && newvalue && panels.value.themen) {
    panels.value.themen = false;
  }
});
const lowVertical = computed(() => (height.value < 740));

const tooLow = computed(() => {
  let retVal = false;
  if (lowVertical.value) {
    if (panels.value.baselayer || panels.value.tools) {
      retVal = true;
    }
  }

  return retVal;
});

const topicVcard = computed(() => {
  let minusPix = 320;
  if (!panels.value.schlag) {
    minusPix -= 60;
  }
  if (panels.value.baselayer) {
    minusPix += 70;
  }
  if (panels.value.tools) {
    minusPix += 115;
    if (elevationProfile.value) {
      minusPix += 120;
    }
  }

  if (mobile.value) {
    minusPix = 50;
  }
  return `${window.innerHeight - minusPix}px`;
});

const scrollDivCalc = computed(() => {
  let minusPix = 475;
  if (!panels.value.schlag) {
    minusPix -= 60;
  }
  if (panels.value.baselayer) {
    minusPix += 70;
  }
  if (panels.value.tools) {
    minusPix += 115;
    if (elevationProfile.value) {
      minusPix += 120;
    }
  }

  if (mobile.value) {
    minusPix = 211;
  }

  return `height: ${window.innerHeight - minusPix}px;`;
});

const scrollDivLargerCalc = computed(() => {
  let minusPix = 475 - 41;
  if (!panels.value.schlag) {
    minusPix -= 60;
  }
  if (panels.value.baselayer) {
    minusPix += 70;
  }
  if (panels.value.tools) {
    minusPix += 115;
    if (elevationProfile.value) {
      minusPix += 120;
    }
  }

  if (mobile.value) {
    minusPix = 170;
  }

  return `height: ${window.innerHeight - minusPix}px;`;
});

watch([topics, gradients], ([t, g]) => {
  const visible = [
    ...t.slice(0).sort(urlSort).map((topic) => (topic.visible ? '1' : '0')),
    ',',
    ...g.map((gradient) => (gradient.visible ? '1' : '0')),
  ].join('');
  if (visible !== route.params.visible) {
    router.push({ params: { ...route.params, visible } });
  }
});
watch(() => route.params.visible, setVisible);
mapReady.then(() => setVisible(route.params.visible));

</script>

<style scoped>
  .topicPanelButton {
    position: absolute;
    left: 10px;
    top: 170px;
  }

  .topicPanelButton.mobile,
  .topicPanelButton.noSchlag.mobile {
    left: auto;
    right: 155px;
    top: 6px;
    z-index: 5000;
  }

  .topicPanelButton.mobilepanel,
  .topicPanelButton.noSchlag.mobilepanel {
    left: 0px;
    top: 50px;
  }

  .topicPanelButton.noSchlag {
    top: 110px;
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
.tabActive.middle {
  border-left: 1px solid #666;
  border-right: 1px solid #666;
  border-top-left-radius: 8px!important;
  border-top-right-radius: 8px!important;
}

.tabActive.right {
  border-left: 1px solid #666;
  border-top-left-radius: 8px!important;
}

.gradientLabel {
  color: #000;
  opacity: .7;
}
.gradientLabel.active {
  opacity: .9;
}
.gradientLabel.selected {
  font-weight: bold;
  opacity: 1;
}
.gradientLabel.disabled {
  opacity: .5;
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
.category {
  font-weight: bold;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.87);
}
</style>

<style>
  /* only work if not scoped */
  .topicFilter {
    border-top: 1px solid #ddd;
    background-color: #f6f6f6;
  }

  .scrollDiv {
    overflow: auto;
  }

  div.width100 .v-selection-control-group {
    width: 100%;
  }

  .topicPanelButton.noSchlag .scrollDiv {
    height: calc(100vh - 485px);

  }

  .scrollDiv .mdi-radiobox-blank, .scrollDiv .mdi-radiobox-marked {
    font-size: 15px!important;
  }

  .scrollDiv .v-label, .topicFilter .v-label, .topicFilter input {
    font-size: 15px!important;
  }

  div.v-selection-control.v-checkbox-btn {
    min-height: auto;
  }

  .v-radio.v-selection-control .v-label {
    color: #000;
    opacity: .7;
  }
  .v-radio.v-selection-control.v-selection-control--dirty .v-label {
    color: #000;
    opacity: .9;
  }
  .topic-warning {
    color: red;
    font-weight: bold;
    opacity: 1;
    white-space: normal;
    cursor: inherit;
  }

</style>
