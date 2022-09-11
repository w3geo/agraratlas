<template>
  <v-btn
    v-if="!panels.themen || mobile"
    class="layerSwitcherButton pa-2"
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
    class="layerSwitcherButton"
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
        selected-class="tabActive right"
      >
        Hangneigungen
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="themen">
        <div
          class="pa-2 scrollDiv"
          :style="scrollDivCalc"
        >
          <v-radio-group
            v-model="selectedTopic"
            class="width100"
          >
            <v-row no-gutters>
              <v-col cols="10">
                <v-radio
                  key="-2"
                  label="Nur Hintergrundkarte"
                  value="none"
                  density="compact"
                />
              </v-col><v-col
                cols="2"
                class="pa-1"
              >
                <div
                  class="colorBox"
                  :style="'background-color: white;'"
                />
              </v-col>
            </v-row>

            <div class="lineFirst">
              <template
                v-for="(topic, index) in topics"
                :key="index"
              >
                <v-row
                  v-if="
                    schlagInfo && onlyTopicsInSchlagExtent ? topic.inSchlagExtent : topic.inExtent
                      || topic.visible"
                  no-gutters
                >
                  <v-col cols="10">
                    <v-radio
                      :label="topic.label"
                      :value="topic.label"
                      hide-details
                      density="compact"
                      :class="{fat : schlagInfo && topic.inSchlagExtent}"
                    />
                  </v-col><v-col
                    cols="2"
                    class="pa-1"
                  >
                    <div
                      class="colorBox"
                      :style="'background-color: ' + topic.color +'; opacity: ' + opacity + ';'"
                    />
                  </v-col>
                </v-row>
              </template>
            </div>
          </v-radio-group>
        </div>
        <div
          class="topicFilter px-2"
        >
          <v-checkbox
            v-model="onlyTopicsInSchlagExtent"
            density="compact"
            hide-details
            label="Nur für den gewählten Schlag mögliche Themen"
            :disabled="!schlagInfo"
          />
        </div>
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
            v-for="(value, key) in gradients"
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
              style="cursor: pointer"
              cols="4"
              class="pa-1 pt-2 text-body-2 gradientLabel"
              :class="{'selected' : schlagInfo && value.inSchlag,
                       'active' : value.visible,
                       'disabled': mapView.zoom < 9}"
              @click="value.visible = !value.visible"
            >
              {{ value.label }}
            </v-col>
            <v-col
              cols="2"
              class="pa-2"
            >
              <div
                class="colorBox"
                :style="'background-color: ' + value.color +'; opacity: ' + opacity + ';'"
              />
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
import { useDisplay } from 'vuetify';
import { useLayers } from '../composables/useLayers';
import { useSchlag } from '../composables/useSchlag';
import { useTopics } from '../composables/useTopics';
import { usePanelControl } from '../composables/usePanelControl';
import { useGradient } from '../composables/useGradient';
import { mapView } from '../composables/useMap';

const { panels, closeOthers } = usePanelControl();
const { topics } = useTopics();
const { opacity } = useLayers();
const { schlagInfo } = useSchlag();
const { gradients } = useGradient();

/** @type {import("vue").Ref<string>} */
const selectedTopic = ref('none');
/** @type {import("vue").Ref<boolean>} */
const onlyTopicsInSchlagExtent = ref(true);

const tab = ref();
const { width, height } = useDisplay();

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
  }

  if (mobile.value) {
    minusPix = 170;
  }

  return `height: ${window.innerHeight - minusPix}px;`;
});

watch(selectedTopic, (value) => {
  topics.forEach((topic) => {
    topic.visible = topic.label === value;
  });
});

</script>

<style scoped>
  .layerSwitcherButton {
    position: absolute;
    left: 10px;
    top: 170px;
  }

  .layerSwitcherButton.mobile,
  .layerSwitcherButton.noSchlag.mobile {
    left: auto;
    right: 155px;
    top: 6px;
    z-index: 5000;
  }

  .layerSwitcherButton.mobilepanel,
  .layerSwitcherButton.noSchlag.mobilepanel {
    left: 0px;
    top: 50px;
  }

  .layerSwitcherButton.noSchlag {
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
.tabActive.right {
  border-left: 1px solid #666;
  border-top-left-radius: 8px!important;
}

div.lineFirst div.v-row:nth-child(1) {
  padding-top: 3px;;
  border-top: 1px solid #ddd;
}
.lineAbove {
  border-top: 1px solid #ddd;
  background-color: #f6f6f6;
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

  .layerSwitcherButton.noSchlag .scrollDiv {
    height: calc(100vh - 485px);

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
    opacity: 1;
  }

  .v-checkbox.denseBox .v-selection-control {
    height: auto!important;
  }

  .v-radio.v-selection-control .v-label {
    color: #000;
    opacity: .7;
  }
  .v-radio.v-selection-control.v-selection-control--dirty .v-label {
    color: #000;
    opacity: .9;
  }

</style>
