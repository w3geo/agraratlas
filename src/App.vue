<template>
  <v-app>
    <v-dialog
      v-model="disclaimer"
      persistent
    >
      <v-card>
        <v-card-title>Haftungsausschluss</v-card-title>
        <v-card-text class="longtext scroll">
          <p>
            Sehr geehrte Benutzerin, sehr geehrter Benutzer,
          </p>
          <p>
            herzlichen Dank, dass Sie den INSPIRE Agraratlas des BML verwenden.
          </p>
          <p>
            Aus den Karteninhalten (Darstellungen) und den dazugehörenden Texten können
            Rechtsansprüche weder begründet noch abgeleitet werden. Das Bundesministerium für Land-
            und Forstwirtschaft, Regionen und Wasserwirtschaft (BML) übernimmt keine Haftung für
            Richtigkeit, Vollständigkeit, Aktualität oder dauernde Verfügbarkeit dieses
            Webkartendienstes. Die Karten und Texte sind keine amtliche Auskunft oder
            rechtsverbindliche Aussage. Amtliche Auskünfte zu einem bestimmten Gebiet oder einer
            bestimmten Frage erteilt auf Anfrage die zuständige Behörde. Die Angabe der zuständigen
            Behörde können Sie in der Metadatensuche des INSPIRE Agrarportal finden.
          </p>
          <p>
            Dargestellt werden Kartenlayer mit Bewirtschaftungsgebieten, unter anderem im Kontext
            zum Mehrfachantrag der neuen Förderperiode für die Gemeinsame Agrarpolitik (GAP) ab
            2023, Gewässernetz, Höhe und Schutzgebiete. Der INSPIRE Agraratlas stellt Verhältnisse
            auf Schlagebene dar, zeigt die Gebietsabgrenzungen auf und soll vorausschauende Planung
            unterstützen, sodass die Informationen bestmöglich genutzt werden können. Die
            dargestellten Kartenlayer haben ausschließlich Informationscharakter. Der Inhalt dieser
            Internetseite kann sich, insbesondere aufgrund unterschiedlicher Aktualität, von der
            Publikation des e-AMA unterscheiden. Die Förderungsantragsstellung ist ausschließlich
            über das e-AMA System der Agrarmarkt Austria (AMA) durchzuführen.
          </p>
          <p>
            Alle Angaben (Berechnungsergebnisse) sind trotz sorgfältigster Bearbeitung/Verarbeitung
            ohne Gewähr und nicht rechtsverbindlich. Eine Haftung des BML für Nachteile, die
            aufgrund der auf INSPIRE.Agraratlas.gv.at angezeigten und abgefragten Inhalte entstanden
            sind, wird ausgeschlossen. Das BML behält sich ausdrücklich vor, Inhalte des INSPIRE
            Agraratlas jederzeit ohne Ankündigung ganz oder teilweise zu ändern, zu ergänzen, zu
            löschen oder zeitweise nicht zu veröffentlichen.
          </p>
          <p>
            Dieser Webkartendienst wird vom Unternehmen <a href="https://w3geo.at/">W3Geo GmbH</a>
            betrieben. W3Geo übernimmt keinerlei Haftung für Schäden oder Mängelfolgeschäden,
            welche durch die Verwendung dieses Webdienstes und all seiner Inhalte entstehen. Die
            Nutzung der Inhalte dieses Webdienstes erfolgt ausschließlich auf Risiko der Benutzerin
            bzw. des Benutzers.
          </p>
          <p>
            Anmerkung zur Barrierefreiheit: Diese Webseite ist mit dem Bundesgesetz über den
            barrierefreien Zugang zu Websites und mobilen Anwendungen des Bundes
            (Web-Zugänglichkeits-Gesetz – WZG), BGBl. I Nr. 59/2019 vereinbar.
          </p>
          <p>
            Gemäß § 2 Abs. 3 lit. d muss die Webseite nicht den, in dem oben angeführten
            Bundesgesetz normierten Anforderungen an die Barrierefreiheit genügen,
            da Online-Karten und Kartendienste, die nicht der Navigation dienen, vom
            Regelungsumfang ausgenommen sind.
          </p>
          <p>Es handelt sich bei agraratlas.inspire.gv.at um einen reinen Darstellungsdienst.</p>
          <p>
            Bei Fragen zur barrierefreien Lesbarkeit des Kartenteiles wenden Sie sich bitte an den
            im Impressum angegebenen Kontakt.
          </p>
          <p>
            <b>Ich habe die obigen Bestimmungen gelesen und nehme diese rechtsverbindlich an.</b>
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="#666"
            block
            @click="disclaimer = false"
          >
            Akzeptieren
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
      @click="drawer = false"
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
            href="https://agrar.inspire.gv.at"
            target="_blank"
          >Über Agraratlas</a>
        </v-col>
        <v-col
          cols="12"
          class="pa-3 pt-1"
        >
          <a
            class="drawerLink"
            href="https://info.bml.gv.at/impressum.html"
            target="_blank"
          >Impressum</a>
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

  .longtext p {
    padding-bottom: 0.5em;
  }
  .longtext a {
    text-decoration: inherit;
    color: inherit;
  }

  .scroll {
    overflow-y: auto;
  }

</style>
<style>
  @supports (-webkit-touch-callout: none) {
    body, #app, .v-application .v-application__wrap {
      min-height: -webkit-fill-available;
    }
  }
</style>
