<template>
  <v-app>
    <v-app-bar
      density="compact"
    >
      <v-app-bar-nav-icon
        variant="text"
        @click.stop="drawer = !drawer"
      />
      <v-app-bar-title>AgrarGIS</v-app-bar-title>
      <v-spacer />
      <v-col
        cols="12"
        sm="8"
        md="4"
      >
        <place-search
          class="placesearch"
          @search="onSearch"
        />
      </v-col>
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
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import GeoJSON from 'ol/format/GeoJSON';
import PlaceSearch from './components/PlaceSearch.vue';
import { useMap } from './composables/useMap';
import router from './plugins/router';

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
</style>
