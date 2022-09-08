<template>
  <v-app>
    <v-dialog
      v-model="disclaimer"
      persistent
    >
      <v-card>
        <v-card-title>Disclaimer</v-card-title>
        <v-card-text>
          <p>
            Alle Inhalte (Karten / Daten) auf dieser Seite werden ohne
            Gewähr verfügbar gemacht. Der Betreiber der Seite haftet
            nicht für Schäden jedweglicher Art durch Fehler
            in / falsche Darstellung von Daten.
          </p>
          <p>
            Durch Klick auf "Verstanden" bestätigen Sie,
            diesen Disclaimer verstanden und mit
            den Nutzungsbedingungen einverstanden zu sein.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="#666"
            block
            @click="disclaimer = false"
          >
            Verstanden
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-app-bar
      density="compact"
    >
      <v-app-bar-nav-icon
        variant="text"
        @click.stop="drawer = !drawer"
      />
      <v-app-bar-title
        v-if="!tooSmall"
        class="font-weight-black text-grey-darken-2 pageTitle"
        :class="{smaller : titleSmall}"
      >
        INSPIRE <br v-if="titleSmall">AGRAR ATLAS
      </v-app-bar-title>
    </v-app-bar>
    <v-navigation-drawer
      v-model="drawer"
      disable-resize-watcher
      temporary
    >
      <v-row no-gutters>
        <v-col
          v-if="tooSmall"
          cols="12"
          class="pa-3 font-weight-black"
          background-color="grey"
        >
          INSPIRE AGRAR ATLAS
        </v-col>
      </v-row>
      <v-row
        no-gutters
        :class="{'mt-4' : !tooSmall}"
      >
        <v-col
          cols="12"
          class="pa-3 pt-1"
        >
          <a
            class="drawerLink"
            href="https://geoportal.inspire.gv.at/"
            target="_blank"
          >Link zu Inhalt</a>
        </v-col>
        <v-col
          cols="12"
          class="pa-3 pt-1"
        >
          <a
            class="drawerLink"
            href="https://geoportal.inspire.gv.at/"
            target="_blank"
          >Link zu Inhalt</a>
        </v-col>
        <v-col
          cols="12"
          class="pa-3 pt-1"
        >
          <a
            class="drawerLink"
            href="https://geoportal.inspire.gv.at/"
            target="_blank"
          >Link zu Inhalt</a>
        </v-col>
      </v-row>
    </v-navigation-drawer>
    <v-btn
      v-if="mobile"
      class="searchButton pa-2"
      size="mobile ? 20 : 30"
      @click="panels.search = !panels.search, closeOthers('search', mobile)"
    >
      <v-icon
        :size="mobile ? 18 : 24"
        color="grey-darken-2"
      >
        mdi-magnify
      </v-icon>
    </v-btn>

    <div
      v-if="mobile"
      class="separator first"
    />
    <div
      v-if="mobile"
      class="separator second"
    />
    <div
      v-if="mobile"
      class="separator third"
    />

    <div
      v-if="!mobile || panels.search"
      class="searchField"
      :class="{'mobile' : mobile}"
    >
      <place-search
        class="placesearch"
        @search="onSearch"
      />
    </div>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useDisplay } from 'vuetify';
import GeoJSON from 'ol/format/GeoJSON';
import PlaceSearch from './components/PlaceSearch.vue';
import { useMap } from './composables/useMap';
import router from './plugins/router';
import { usePanelControl } from './composables/usePanelControl';

const { panels, closeOthers } = usePanelControl();

const { width, height } = useDisplay();

const mobile = computed(() => (width.value < 800 || height.value < 520));
const titleSmall = computed(() => (width.value < 600));
const tooSmall = computed(() => (width.value < 400));

const { map } = useMap();
const drawer = ref(false);
const disclaimer = ref(true);

const geojson = new GeoJSON();

const onSearch = (value) => {
  if (value) {
    map.getView().fit(geojson.readGeometry(value.geometry), {
      minZoom: 12,
      maxZoom: 19,
      duration: 500,
    });
    router.push('/');
  }
};
</script>

<style scoped>
  .separator {
    height: 48px;
    width: 1px;
    background-color: #eee;
    position: absolute;
    top: 0px;
    z-index: 5000;
  }

  .separator.first {
    right: 52px;
  }
  .separator.second {
    right: 146px;
  }
  .separator.third {
    right: 242px;
  }
  .searchButton {
    position:absolute;
    right: 10px;
    top: 6px;
    z-index: 5000;
  }

  .placesearch {
    white-space: nowrap;
  }

  .searchField {
    z-index: 2000;
    position: absolute;
    right: 10px;
    top: 4px;
    width: 50%;
    max-width: 340px;
  }

  .searchField.mobile {
    right: 0px;
    position: absolute;
    top: 50px;
    width: 100vw;
    max-width: 100vw;
    background-color: white;;
  }
  .pageTitle {
    font-size: 20px!important;
  }
  .pageTitle.smaller {
    font-size: 14px!important;
    line-height: 15px!important;
  }

  .drawerLink {
    color: #666;
    text-decoration: none;
    font-size: 18px;
  }

</style>
<style>
  @supports (-webkit-touch-callout: none) {
    body, #app, .v-application .v-application__wrap {
      min-height: -webkit-fill-available;
    }
  }
</style>
