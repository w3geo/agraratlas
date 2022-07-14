<template>
  <v-container>
    <v-row class="text-center">
      <v-col cols="12">
        <v-img
          :src="logo"
          class="my-3"
          contain
          height="200"
        />
      </v-col>

      <v-col
        class="mb-5"
        cols="12"
      >
        <h2 class="headline font-weight-bold mb-5">
          Wichtige Links
        </h2>

        <v-row justify="center">
          <a
            v-for="(link, i) in importantLinks"
            :key="i"
            :href="link.href"
            class="subheading mx-3"
            target="_blank"
          >
            {{ link.text }}
          </a>
        </v-row>
      </v-col>

    </v-row>
  </v-container>
</template>

<script>
import logo from '../assets/logo.svg';

export default {
  name: 'About', // eslint-disable-line vue/multi-word-component-names

  data: () => ({
    importantLinks: [
      {
        text: 'Agrarportal',
        href: 'https://agrarportal.inspire.gv.at/',
      },
    ],
    logo,
  }),
};
</script>
