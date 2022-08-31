<template>
  <v-app>
    <v-app-bar
      density="compact"
    >
      <v-app-bar-nav-icon
        variant="text"
        @click.stop="drawer = !drawer"
      />
      <v-app-bar-title
        class="font-weight-black text-grey-darken-2"
      >
        INSPIRE AGRAR ATLAS
      </v-app-bar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer">
      <v-list>
        <v-list-item
          v-for="item in items"
          :key="item.text"
          :to="item.to"
        >
          <v-list-item-title>{{ item.text }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <div
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
// import { useMyDisplay } from './composables/useMyDisplay';
// const { mobile } = useMyDisplay();
const { width, height } = useDisplay();

const mobile = computed(() => (width.value < 800 || height.value < 520));

const { map } = useMap();
const drawer = ref(false);
const items = [
  { text: 'Karte', to: '/' },
  { text: 'Über AgrarGIS', to: '/about' },
];

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
  position: absolute;
  top: 50px;
  width: 100%;
}
</style>
