/* eslint-disable no-use-before-define */
import './useTools.css';
import { unByKey } from 'ol/Observable';
import Overlay from 'ol/Overlay';
import { getArea, getLength } from 'ol/sphere';
import { LineString, Polygon } from 'ol/geom';
import Draw from 'ol/interaction/Draw';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import Feature from 'ol/Feature';
import {
  Circle, Fill, Stroke, Text, Style,
} from 'ol/style';
import { Modify, Snap, Interaction } from 'ol/interaction';
import Point from 'ol/geom/Point';
import GeoJSON from 'ol/format/GeoJSON';
import { ref, watch } from 'vue';
import { map } from './useMap';

/**
 * Style function for imported or drawn vector features.
 * @param {import("ol").Feature} feature Feature.
 * @return {Array<import("ol/style").Style>} Styles.
 */
function sketchStyleFunction(feature) {
  function createStyle(color, width) {
    const image = new Circle({
      radius: 5,
      fill: null,
      stroke: new Stroke({ color, width }),
    });

    return {
      Point: new Style({
        image,
      }),
      LineString: new Style({
        stroke: new Stroke({
          color,
          width,
        }),
      }),
      MultiLineString: new Style({
        stroke: new Stroke({
          color,
          width,
        }),
      }),
      MultiPoint: new Style({
        image,
      }),
      MultiPolygon: new Style({
        stroke: new Stroke({
          color,
          width,
        }),
      }),
      Polygon: new Style({
        stroke: new Stroke({
          color,
          width,
        }),
      }),
      GeometryCollection: new Style({
        stroke: new Stroke({
          color,
          width,
        }),
        fill: new Fill({
          color,
        }),
        image: new Circle({
          radius: 10,
          fill: null,
          stroke: new Stroke({
            color,
            width,
          }),
        }),
      }),
      Circle: new Style({
        stroke: new Stroke({
          color,
          width,
        }),
      }),
    };
  }
  let color = '#fff';
  let width = 3;
  const underlyingStyle = createStyle(color, width);

  color = '#000';
  width = 1;
  const overlyingStyle = createStyle(color, width);

  const styleArray = [
    underlyingStyle[feature.getGeometry().getType()],
    overlyingStyle[feature.getGeometry().getType()],
  ];
  return styleArray;
}

function labelStylefunction(feature) {
  const underlyingStyle = new Style({
    image: new Circle({
      radius: 5,
      fill: null,
      stroke: new Stroke({ color: 'white', width: 3 }),
    }),
  });

  const overlyingStyle = new Style({
    image: new Circle({
      radius: 5,
      fill: null,
      stroke: new Stroke({ color: 'black', width: 1.5 }),
    }),
    text: new Text({
      text: feature.get('text'),
      font: '16px Open Sans,sans-serif',
      fill: new Fill({
        color: '#000',
      }),
      offsetY: 11,
      offsetX: 8,
      textAlign: 'left',
      padding: [5, 5, 5, 5],
      stroke: new Stroke({
        color: '#fff',
        width: 3,
      }),
    }),
  });
  return [underlyingStyle, overlyingStyle];
}

const tempLayer = [];
function getTempLayer(layerName) {
  for (let i = 0; i < tempLayer.length; i += 1) {
    const thisLayer = tempLayer[i];
    if (thisLayer.get('name') === layerName) {
      return thisLayer;
    }
  }
  return undefined;
}

/**
 * draw interaction for measuring
 */
let measureDraw;

/**
 * change event listener for calculating geometry size
 * @param {import("ol/interaction/Draw").DrawEvent} e
* */
const geomChangeListener = (e) => {
  const geom = e.target.getGeometry();
  let output;
  let tooltipCoord;
  if (geom instanceof Polygon) {
    output = formatArea(geom);
    tooltipCoord = geom.getInteriorPoint();
  } else if (geom instanceof LineString) {
    output = formatLength(geom);
    tooltipCoord = geom; // get actual feature?
  }
  measureTool.label.set('text', output);
  measureTool.label.setGeometry(tooltipCoord);
};

/**
 * removes measure interaction
 */
function stopMeasure() {
  unByKey(geomChangeListener);
  // removeSketch();
  measureTool.map.removeInteraction(measureDraw);
  measureTool.map.removeInteraction(measureTool.tooltipChangeHandler);
  if (measureTool.helpTooltip) {
    measureTool.helpTooltip.setPosition(undefined);
    measureTool.helpTooltip.setMap(null);
  }
}

/**
 * create and style a help tooltip as ol overlay
 * @param {Object} app measure or sketch
 */
function createHelpTooltip(app) {
  app.helpTooltipElement = document.createElement('div');
  app.helpTooltipElement.className = 'tooltip hidden';
  app.helpTooltip = new Overlay({
    element: app.helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left',
  });
  app.helpTooltip.setMap(map);

  map.getViewport().addEventListener('mouseout', () => {
    app.helpTooltipElement.classList.add('hidden');
  });
  map.getViewport().addEventListener('mouseout', () => {
    app.helpTooltipElement.classList.add('hidden');
  });
}

/**
 * initialize measure tool.
 * @return {Function} Click handler function
 */
function measureTool() {
  measureTool.map = map;

  initMeasure();

  /**
   * Starts measure interaction
   */
  function onOffHandler() {
    if (measure.value) {
      stopSketching();
      removeTextOverlays();
      stopMeasure();
      // start measuring
      addInteraction(measure.value);
    } else {
      stopMeasure();
    }
  }

  /**
   * initializes measure interaction, provides vector layer, styles and draw interaction
   */
  function initMeasure() {
    measureTool.source = new VectorSource();

    const defaultStyle = new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.3)',
      }),
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
      }),
      text: new Text({
        text: '',
        font: '16px Open Sans,sans-serif',
        fill: new Fill({
          color: '#000',
        }),
        offsetY: -7,
        padding: [5, 5, 5, 5],
        stroke: new Stroke({
          color: '#fff',
          width: 3,
        }),
      }),
    });

    if (getTempLayer('measure')) {
      measureTool.measureLayer = getTempLayer('measure');
      getTempLayer('measure').setMap(measureTool.map);
    } else {
      measureTool.measureLayer = new VectorLayer({
        source: measureTool.source,
        style(feature) {
          defaultStyle.getText().setText(feature.get('text'));
          return defaultStyle;
        },
        name: 'measure',
      });
    }
    tempLayer.push(measureTool.measureLayer);
  }

  /**
   * add measure interaction of a chosen type
   * @param {string} type type of draw interaction ('Polygon' or 'LineString');
   */
  function addInteraction(type) {
    measureTool.tooltipChangeHandler = measureTool.map.on('pointermove', pointerMoveHandler);

    measureDraw = new Draw({
      stopClick: true,
      source: measureTool.source,
      type,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.3)',
        }),
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2,
        }),
        image: new Circle({
          radius: 5,
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
        }),
      }),
    });
    measureTool.map.addInteraction(measureDraw);
    // measure.measureLayer.setMap(measure.map);

    createHelpTooltip(measureTool, map);

    measureDraw.on('drawstart', (evt) => {
      // set map on drawstart, if user deletes layer while measuring
      measureTool.measureLayer.setMap(measureTool.map);

      // define helpMsg here also, because right after first click there is no pointermove
      measureTool.helpTooltipElement.innerHTML = 'Fortsetzen mit Klick';

      // set sketch
      measureTool.sketch = evt.feature;

      // set label for showing the measurement
      measureTool.label = new Feature({
        text: '',
      });

      // listener to handle area output while drawing
      measureTool.sketch.on('change', geomChangeListener);

      measureTool.source.addFeature(measureTool.label);
    });

    measureDraw.on('drawend', () => {
      // unset sketch
      measureTool.sketch.un('change', geomChangeListener);
      measureTool.sketch = null;
      measureTool.helpTooltipElement.innerHTML = 'Beginnen mit Klick';
    });
  }

  /**
   * handles tooltip behaviour
   * @param {Event} evt pointermove event
   */
  function pointerMoveHandler(evt) {
    if (evt.dragging) {
      return;
    }

    let helpMsg = 'Beginnen mit Klick';

    if (measureTool.sketch) {
      helpMsg = 'Fortsetzen mit Klick, beenden mit 2x Klick';
      const geom = measureTool.sketch.getGeometry();
      if (geom instanceof Polygon && (geom.getCoordinates()[0].length < 4)) {
        helpMsg = 'Fortsetzen mit Klick';
      }
    }

    measureTool.helpTooltipElement.innerHTML = helpMsg;
    measureTool.helpTooltip.setPosition(evt.coordinate);

    measureTool.helpTooltipElement.classList.remove('hidden');
  }
  return onOffHandler;
}

/**
 * calculate and format length of lineDash
 * @param {import("ol/geom").LineString} line line geometry
 * @returns {string} length of line, formated as string
 */
function formatLength(line) {
  const length = getLength(line, { projection: 'EPSG:4326' });
  let output;
  if (length > 1000) {
    output = `${(Math.round((length / 1000) * 100) / 100).toLocaleString('de-AT')} km`;
  } else {
    output = `${(Math.round(length * 100) / 100).toLocaleString('de-AT')} m`;
  }
  return output;
}

/**
 * calculate and format area of polygon
 * @param {import("ol/geom").Polygon} polygon polygon geometry
 * @returns {string} area of polygon, formated as string
 */
function formatArea(polygon) {
  const area = getArea(polygon, { projection: 'EPSG:4326' });
  let output;
  if (area > 100000) {
    output = `${(Math.round((area / 1000000) * 100) / 100).toLocaleString('de-AT')} km²`;
  } else if (area > 1000) {
    output = `${(area / 10000).toLocaleString('de-AT', { maximumFractionDigits: 2 })} ha`;
  } else {
    output = `${(Math.round(area * 100) / 100).toLocaleString('de-AT')} m²`;
  }
  return output;
}

/**
 * instance of TextInteraction for newly written text on map
 */
let addTextForSketch;

/**
 * interaction to snap sketches to itself
 */
let snap;

const vectorSource = new VectorSource();

const sketchLayer = new VectorLayer({
  source: vectorSource,
  style: sketchStyleFunction,
  name: 'sketch',
  renderBuffer: 500,
});

// don't use the normal source for modifying to prevent
// features (especially text) to stick together forever
const modifySource = new VectorSource();
const modify = initModify(modifySource);

// object for the tooltip messages
const tooltipHolder = {};

/**
 * draw interaction for sketching lines
 */
const drawLine = new Draw({
  stopClick: true, // true breaks modify?
  source: vectorSource,
  type: 'LineString',
  style: sketchStyleFunction,
});

drawLine.on('drawstart', (evt) => {
  sketchLayer.setMap(evt.target.getMap());
  modify.setActive(false);
  tooltipHolder.helpTooltipElement.innerHTML = 'Fortsetzen mit Klick, beenden mit 2x Klick';
  tooltipHolder.feature = true;
}, this);

drawLine.on('drawend', () => {
  modify.setActive(true);
  tooltipHolder.helpTooltipElement.innerHTML = 'Beginnen mit Klick';
  tooltipHolder.feature = false;
}, this);

function initModify(source) {
  const modifyInteraction = new Modify({
    source,
  });
  modifyInteraction.on('modifystart', () => {
    removeTextOverlays();
    tooltipHolder.helpTooltipElement.classList.add('hidden');
  });
  modifyInteraction.on('modifyend', (e) => {
    // removeTextOverlays();
    const featurePosition = e.mapBrowserEvent.coordinate;
    tooltipHolder.helpTooltip.setPosition(featurePosition); // after modify, before next pointermove
    tooltipHolder.helpTooltipElement.classList.remove('hidden');
  });
  return modifyInteraction;
}

/**
 * pointermove handler for preventing multiple select when modifying
 * @param {import("ol/MapBrowserEvent").default} e openlayers pointermove event
 */
const modifyPointerMoveHandler = ([localMap, sketch], e) => {
  if (modify.handlingDownUpSequence) {
    return;
  }
  if (e.dragging) {
    return;
  }
  const features = localMap.getFeaturesAtPixel(e.pixel, {
    layerFilter(l) {
      return l === sketch;
    },
  });
  if (features.length && features[0] !== modifySource.getFeatures()[0]) {
    modifySource.clear();
    modifySource.addFeature(features[0]);
  }
};

/**
 *
 */
let helpMessagePointerMove;
let modifyPointerMove;

/**
 * initialize measure tool.
 * @return {function} Click handler function
 */
function createSketch() {
  tempLayer.push(sketchLayer); // remove layers in maplayers.js
  createHelpTooltip(tooltipHolder, map);

  // make sure the addTextInteraction is above the standard popup interaction
  // text interaction
  addTextForSketch = new TextInteraction(map, sketchLayer, tooltipHolder);
  addTextForSketch.setActive(false);
  map.addInteraction(addTextForSketch);
  // drawline interaction
  drawLine.setActive(false);
  map.addInteraction(drawLine);
  // snap interaction
  snap = new Snap({
    source: vectorSource,
  });
  snap.setActive(false);
  map.addInteraction(snap);
  // modify interaction
  // set this true when editing text, check it before creating new text
  // contains featureId, if a text is to be modified
  modify.setActive(false);
  map.addInteraction(modify);

  function activateSketchInteraction(type) {
    modifyPointerMove = modifyPointerMoveHandler.bind(this, [map, sketchLayer]);
    map.on('pointermove', modifyPointerMove);
    sketchLayer.setMap(map);

    if (type === 'Point') {
      addTextForSketch.setActive(true);
      modify.setActive(true);
    } else { // if type === 'LineString'
      drawLine.setActive(true);
      modify.setActive(true);
      snap.setActive(true);
    }

    // pointerMoveHandler for help messages
    helpMessagePointerMove = (evt) => {
      if (evt.dragging) {
        return;
      }
      let helpMsg = 'Beginnen mit Klick';
      if (tooltipHolder.feature && type !== 'Point') { // handle messages for points in textinteraction
        helpMsg = 'Fortsetzen mit Klick, beenden mit 2x Klick';
      }
      if (!tooltipHolder.feature || type !== 'Point') { // dont set position while typing
        tooltipHolder.helpTooltipElement.innerHTML = helpMsg;
        tooltipHolder.helpTooltip.setPosition(evt.coordinate);
        tooltipHolder.helpTooltipElement.classList.remove('hidden');
      }
    };
    map.on('pointermove', helpMessagePointerMove);
  }

  function onOffHandler() {
    stopSketching();
    if (draw.value) {
      // remove old interactions
      stopMeasure();
      // immediately start modifying for imported geojson
      modify.setActive(true);
      // start drawing
      activateSketchInteraction(draw.value);
      tooltipHolder.helpTooltip.setMap(map);
    }
  }
  return onOffHandler;
}

/**
 * removes drawLine interaction
 */
function stopSketching() {
  if (map.getListeners('pointermove').includes(helpMessagePointerMove)) {
    map.un('pointermove', helpMessagePointerMove);
  }
  if (map.getListeners('pointermove').includes(modifyPointerMove)) {
    map.un('pointermove', modifyPointerMove);
  }

  addTextForSketch.setActive(false);
  drawLine.setActive(false);
  modify.setActive(false);
  snap.setActive(false);
  // remove unfinished Overlays
  removeTextOverlays();
  if (tooltipHolder && tooltipHolder.helpTooltip) {
    tooltipHolder.helpTooltip.setPosition(undefined);
    tooltipHolder.helpTooltip.setMap(null);
  }
}

/**
 * array containing all sketch overlays, like unfinished textboxes
 */
const textOverlays = [];

/**
 * removes all (unfinished) text overlays from the map
 */
function removeTextOverlays() {
  const { length } = textOverlays;
  for (let i = length - 1; i >= 0; i -= 1) {
    textOverlays[i].setPosition(undefined);
    textOverlays[i].setMap(null);
  }
  textOverlays.length = 0;
}

class TextInteraction extends Interaction {
  /**
   * @param {module:ol/CanvasMap~CanvasMap} localMap map
   * @param {ol/layer/Vector~VectorLayer} sketchLayer layer for creating or changing text
   */
  constructor(localMap, sketch) {
    super({
      handleEvent: TextInteraction.prototype.handleEvent,
    });
    this.map = localMap;
    this.sketchLayer = sketch;
  }

  handleEvent(evt) {
    if (evt.type !== 'click') {
      return true;
    }
    const featuresFound = this.checkForText(evt);
    // return false prevents other click event like standard popup
    // if no features are found, and this interaction is called for
    // an imported GeoJSON, allow standard popup to be created
    if (!featuresFound && this.sketchLayer.get('name') === 'importedGeoJSON') {
      return true;
    }
    return false;
  }

  // at the down event, check if text exists.
  checkForText(evt) {
  // const map = this.map;
    this.editTextFeature = null;
    // forEachFeatureAtPixel,... feature ist erstes feature mit Text
    const currentSketchLayer = this.sketchLayer;
    this.map.forEachFeatureAtPixel(
      evt.pixel,
      (feature) => {
        if (feature.get('text')) {
          this.editTextFeature = feature;
        }
      },

      {
        layerFilter(layer) {
          return !!(layer.get('name') === currentSketchLayer.get('name'));
        },
      },
    );
    this.addTextbox(evt.coordinate);
    return !!this.editTextFeature;
  }

  handleDragEvent() {} // eslint-disable-line class-methods-use-this

  handleMoveEvent() {} // eslint-disable-line class-methods-use-this

  /**
   * creates a popup for text-input from user.
   * @param {import("ol/coordinate").Coordinate} coordinate coordinate as position of overlay
   */
  addTextbox(coordinate) {
    tooltipHolder.feature = true;
    removeTextOverlays(this.map);
    // don't create new feature when editing text
    const target = document.createElement('div');
    target.classList.add('textPopup');
    // create textBox
    this.textBox = document.createElement('textarea');
    this.textBox.classList.add('textBox');
    target.appendChild(this.textBox);
    // create overlay
    const overlay = new Overlay({
      element: target,
      positioning: 'top-left',
      autoPan: false,
      offset: [6, 2],
    });
    textOverlays.push(overlay);
    overlay.setMap(this.map);

    // if feature has text, start with existing text in textBox
    if (this.editTextFeature) {
      const text = this.editTextFeature.get('text');
      this.textBox.value = text;
      coordinate = this.editTextFeature.getGeometry().getCoordinates();
    // this.editTextFeature = null;
    } else if (this.sketchLayer.get('name') === 'importedGeoJSON') {
      return;
    }
    overlay.setPosition(coordinate);
    const options = {
      textBox: this.textBox,
      coordinate,
      overlay,
      feature: this.editTextFeature,
      sketchLayer: this.sketchLayer,
      map: this.map,
    };
    // keypress doesn't recognize backspace
    this.textBox.addEventListener('keydown', this.applyText.bind(options));
    this.textBox.focus();
    const pixel = this.map.getPixelFromCoordinate(coordinate);
    pixel[1] -= 20; // add some pixel to place tooltip above textbox
    tooltipHolder.helpTooltip.setPosition(this.map.getCoordinateFromPixel(pixel));
    tooltipHolder.helpTooltipElement.innerHTML = 'Texteingabe';
  }

  /**
   * create or update point feature with text from corresponding text area
   * *this* is an object, containing the properties:
   * textBox
   * coordinate
   * Overlay
   * feature
   * sketchLayer
   * map
   * @param {Event} evt click event, must be fired from the textbox
   * @returns {boolean} true if pressed key is not enter
   */
  applyText(evt) {
    const key = evt.keyCode;
    // get text of textBox
    let text = this.textBox.value;
    const coordinates = this.coordinate;
    // try to get stored ID of feature, if none exists, create new one and store new ID
    if (this.feature) {
    // const feature = this.sketchLayer.getSource().getFeatureById(this.featureID);
    // const feature = this.editTextFeature;
    // if backspace, take away the last digit,
    // because keydown is called before actual change of textbox
      if (key === 8) {
        text = text.substring(0, text.length - 1);
      }
      this.feature.set('text', text);
      if (key !== 13) {
        const helpMsg = (text.length === 0) ? 'Texteingabe' : 'Beenden mit Return-Taste';
        tooltipHolder.helpTooltipElement.innerHTML = helpMsg;
        return true;
      }
    } else {
      if (key !== 13) { // If the user has NOT pressed enter
        tooltipHolder.helpTooltipElement.innerHTML = 'Beenden mit Return-Taste';
        return true;
      }
      const feature = new Feature({
        geometry: new Point(coordinates),
      });
      feature.set('text', text);
      const newFeatureID = Number(Date.now().toString()); // other way?
      feature.setId(newFeatureID);
      feature.setStyle(labelStylefunction);
      this.sketchLayer.getSource().addFeature(feature);
      this.sketchLayer.setMap(this.map);
      tooltipHolder.feature = false;
      tooltipHolder.helpTooltipElement.innerHTML = 'Beginnen mit Klick';
    }
    // unset temporary overlays
    this.overlay.setMap(null);
    this.overlay.setPosition(undefined);
    this.textBox = null;
    removeTextOverlays(this.map);
    return false;
  }
}

export function exportJson() {
  const exportLayer = getTempLayer('sketch');
  const writer = new GeoJSON();
  const geojsonStr = writer.writeFeatures(exportLayer.getSource().getFeatures());
  const filename = 'map_export.geojson';

  const element = document.createElement('a');
  if (navigator.msSaveBlob) {
    const blob = new Blob([geojsonStr]);
    element.addEventListener('click', () => {
      navigator.msSaveBlob(blob, filename);
    });
    element.click();
  } else {
    document.body.appendChild(element);
    element.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(geojsonStr)}`);
    element.setAttribute('download', filename);
    element.target = '_self';
    element.click();
    document.body.removeChild(element);
  }
}

/**
 * initialize button for GeoJSON import
 * @param {module:ol/CanvasMap~CanvasMap} map The map the GeoJSON is going to be imported to.
 * @return {function} Click handler function
 */
function initJsonImport() {
  return () => {
    const hiddenButton = document.createElement('input');
    hiddenButton.type = 'file';
    hiddenButton.addEventListener('change', (evt) => {
      const { files } = evt.target;
      const file = files[0];
      const reader = new FileReader();

      reader.onload = ((theFile) => {
        const geoJSON = JSON.parse(theFile.currentTarget.result);
        addLayer(geoJSON);
      });

      reader.readAsText(file);
    }, false);
    hiddenButton.click();
  };
}

function addLayer(geoJSON) {
  const features = new GeoJSON().readFeatures(geoJSON);

  // style label points differently
  for (let i = 0; i < features.length; i += 1) {
    if (features[i].getGeometry().getType() === 'Point' && features[i].get('text')) {
      features[i].setStyle(labelStylefunction);
    }
  }

  const sketch = getTempLayer('sketch');
  sketch.getSource().addFeatures(features);
  sketch.setMap(map);

  // create temporary source, only to get extent for zooming to the newest added features
  const extentSource = new VectorSource({
    features,
  });
  const view = map.getView();
  view.fit(
    extentSource.getExtent(),
    {
      size: map.getSize(),
      duration: 500,
    },
  );
}

const importJson = initJsonImport();

/** @type {import('vue').Ref<'LineString'|'Point'} */
export const draw = ref();
const drawHandler = createSketch();
watch(draw, (value) => {
  if (value) {
    measure.value = null;
    drawHandler(value);
  } else {
    stopSketching();
  }
});

function clearDraw() {
  getTempLayer('sketch').getSource().clear();
}

/** @type {import('vue').Ref<'Polygon'|'LineString'} */
export const measure = ref();
const measureHandler = measureTool();
watch(measure, (value) => {
  if (value) {
    draw.value = null;
    measureHandler(value);
  } else {
    stopMeasure();
  }
});

function clearMeasure() {
  getTempLayer('measure').getSource().clear();
}

export function useTools() {
  return {
    draw, clearDraw, measure, clearMeasure, importJson, exportJson,
  };
}
