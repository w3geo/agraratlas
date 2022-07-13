<template>
  <v-app>
    <v-app-bar density="compact">
      <v-app-bar-nav-icon variant="text" @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>Agrar-GIS</v-app-bar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer">
      <v-list>
        <v-list-item-group>
          <v-list-item v-for="item in items" :key="item.text" :to="item.to">
            <v-list-item-title>{{ item.text }}</v-list-item-title>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  data: () => ({
    drawer: false,
    items: [
      { text: 'Karte', to: '/' },
      { text: 'Über Agrar-GIS', to: '/about' },
    ],
  }),
};
</script>
