<template>
  <v-btn
    v-if="!panels.schlag || mobile"
    class="schlagInfoButton pa-2"
    :class="{mobile : mobile}"
    size="mobile ? 20 : 30"
    @click="panels.schlag = !panels.schlag, closeOthers('schlag', mobile)"
  >
    <v-icon
      :size="mobile ? 18 : 24"
      color="grey-darken-2"
    >
      mdi-information
    </v-icon>
  </v-btn>

  <v-card
    v-if="panels.schlag && !tooLow"
    class="schlagInfoButton"
    :class="{mobilepanel : mobile}"
    :width="mobile ? '100%' : '440px'"
    height="105px"
  >
    <v-row
      no-gutters
      class="boxHeader"
    >
      <v-col class="text-button text-white">
        <v-icon class="mx-1">
          mdi-information
        </v-icon>
        Schlag-Information ({{ schlaegeLastModified }})
      </v-col>
      <v-col
        cols="2"
        align="right"
      >
        <v-icon
          color="white"
          class="mr-1 mb-1"
          @click="panels.schlag = !panels.schlag"
        >
          mdi-close-box
        </v-icon>
      </v-col>
    </v-row>

    <v-row
      v-if="schlagInfo && !schlagInfo.loading"
      no-gutters
    >
      <v-col cols="13">
        <v-row
          no-gutters
          class="text-body-2"
        >
          <v-col
            class="pa-2 pb-1"
            cols="3"
          >
            Nutzung:
          </v-col>
          <v-col
            class="pa-2 pb-1"
            cols="8"
          >
            <b v-if="schlagInfo.kz_bio_oepul_jn === 'J'">BIO </b>{{ schlagInfo.snar_bezeichnung }}
            ({{ schlagInfo.fnar_code }})
          </v-col>
          <v-col
            class="px-2"
            cols="3"
          >
            Fläche:
          </v-col>
          <v-col
            class="px-2"
            cols="8"
          >
            {{ schlagInfo.sl_flaeche_brutto_ha.toLocaleString('de-AT',
                                                              {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                              }) }}
            ha<span v-if="heavySoilHectars > 0">, davon
              {{ heavySoilHectars.toLocaleString('de-AT',
                                                 {
                                                   minimumFractionDigits: 2,
                                                   maximumFractionDigits: 2
                                                 }) }} ha schwere Böden</span>
          </v-col>
          <v-col cols="2" />
        </v-row>
      </v-col>
      <v-col
        cols="1"
        class="pa-1 schlagTools"
        align="right"
      >
        <v-btn
          v-if="canCenter"
          class="mt-1"
          width="26"
          height="26"
          icon
          flat
          rounded
          color="grey-lighten-3"
          title="Auf Schlag zoomen"
          @click.stop="center"
        >
          <v-icon
            size="20"
            icon="mdi-crosshairs"
          />
        </v-btn>
        <v-btn
          v-if="schlagInfo"
          class="mt-2"
          width="26"
          height="26"
          icon
          flat
          rounded
          color="grey-lighten-3"
          title="Schlag abwählen"
          @click.stop="schlagInfo = null"
        >
          <v-icon
            size="20"
            icon="mdi-trash-can-outline"
          />
        </v-btn>
      </v-col>
    </v-row>
    <v-row
      v-else-if="mapView.zoom < 12"
      no-gutters
      class="pa-2 text-body-2"
    >
      Verwenden Sie die Suche oder klicken Sie in die Karte, um Schläge anzuzeigen.
    </v-row>
    <v-row
      v-else
      no-gutters
      class="pa-2 text-body-2"
    >
      Klicken Sie auf einen Schlag, um Informationen zu erhalten.
    </v-row>
  </v-card>
</template>

<script setup>
import { watch, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCenter } from 'ol/extent';
import { equals } from 'ol/coordinate';
import { useDisplay } from 'vuetify';
import { useSchlag } from '../composables/useSchlag';
import { mapReady, useMap } from '../composables/useMap';
import { usePanelControl } from '../composables/usePanelControl';
import { useHeavySoil } from '../composables/useHeavySoil';
import { SCHLAEGE_SOURCE } from '../constants';

const { panels, closeOthers } = usePanelControl();

const { width, height } = useDisplay();
const { schlagInfo } = useSchlag();
const { heavySoilHectars } = useHeavySoil();
const { map, mapView } = useMap();
const route = useRoute();
const router = useRouter();

const emit = defineEmits(['schlag']);

const mobile = computed(() => (width.value < 800 || height.value < 520));
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

const schlaegeLastModified = ref();
mapReady.then(() => {
  const date = new Date(map.get('mapbox-style').metadata.sources[SCHLAEGE_SOURCE].lastModified);
  schlaegeLastModified.value = new Intl.DateTimeFormat('de-AT').format(date);
});

function center() {
  map.getView().fit(schlagInfo.value.extent, {
    maxZoom: 17,
    duration: 500,
    padding: [50, 50, 50, 50],
  });
}

function setSchlagId(id) {
  if (id !== schlagInfo.value?.localID) {
    schlagInfo.value = id ? {
      loading: true,
      localID: id,
    } : null;
  }
}

const canCenter = computed(() => schlagInfo.value?.extent && (!equals(
  getCenter(schlagInfo.value.extent).map((v) => v.toFixed(4)),
  mapView.value.center.map((v) => v.toFixed(4)),
) || mapView.value.zoom < 12));

watch(schlagInfo, (value) => {
  if (value?.localID !== route.params.schlagId) {
    router.push({ params: { ...route.params, schlagId: value?.localID } });
  }
  if (value && !value.loading) {
    emit('schlag', true);
  }
});

map.on('singleclick', (event) => {
  if (map.getView().getZoom() < 12) {
    map.getView().animate({
      zoom: 12,
      center: event.coordinate,
      duration: 500,
    });
  }
});

watch(() => route.params.schlagId, setSchlagId);
setSchlagId(route.params.schlagId);
</script>

<style scoped>
  .details {
    cursor: pointer;
  }
  .schlagInfoButton {
    position: absolute;
    left: 10px;
    top: 60px;
  }

  .schlagInfoButton.mobile {
    left: auto;
    right: 197px;
    top: 6px;
    z-index: 5000;
  }

  .schlagInfoButton.mobilepanel {
    left: 0px;
    top: 50px;
  }

  .boxHeader .v-col {
    height: 30px;
    line-height: 30px;
    background-color: #777;
  }

.schlagTools button {
  display: block;
}
</style>
