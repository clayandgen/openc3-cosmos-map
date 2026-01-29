<!--
# Copyright 206 OpenC3, Inc.
# All Rights Reserved.
#
# This file may also be used under the terms of a commercial license
# if purchased from OpenC3, Inc.
-->

<template>
  <div>
    <top-bar :menus="menus" :title="title" />
    <div class="map-container">
      <v-alert v-if="error" type="error" closable class="ma-4">
        {{ error }}
      </v-alert>
      <div v-if="!wmtsUrl" class="no-server-message">
        <v-icon size="64" class="mb-4">mdi-map-marker-question</v-icon>
        <p>No WMTS server configured</p>
        <p class="text-caption">
          Use File &rarr; Set WMTS Server to configure a WMTS endpoint
        </p>
      </div>
      <div ref="mapContainer" class="map" :class="{ hidden: !wmtsUrl }"></div>
    </div>

    <!-- Set WMTS Server Dialog -->
    <v-dialog
      v-model="wmtsDialog"
      max-width="600"
      persistent
      @keydown.esc="cancelWmtsDialog"
    >
      <v-card>
        <v-toolbar height="48">
          <v-spacer />
          <span class="text-h6">Set WMTS Server</span>
          <v-spacer />
          <v-btn icon data-test="close-wmts-dialog" @click="cancelWmtsDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <div class="pa-3">
            <v-text-field
              v-model="wmtsUrlInput"
              label="WMTS Capabilities URL"
              placeholder="https://example.com/wmts/1.0.0/WMTSCapabilities.xml"
              hint="Enter the URL to the WMTS GetCapabilities endpoint"
              persistent-hint
              data-test="wmts-url-input"
              @keydown.enter="fetchCapabilities"
            />
            <v-btn
              class="mt-3"
              color="primary"
              :loading="loadingCapabilities"
              :disabled="!wmtsUrlInput"
              @click="fetchCapabilities"
            >
              Fetch Layers
            </v-btn>

            <div v-if="availableLayers.length > 0" class="mt-4">
              <v-select
                v-model="selectedLayer"
                :items="availableLayers"
                item-title="title"
                item-value="identifier"
                label="Select Layer"
                data-test="layer-select"
              />
              <v-select
                v-if="selectedLayerMatrixSets.length > 0"
                v-model="selectedMatrixSet"
                :items="selectedLayerMatrixSets"
                label="Tile Matrix Set"
                data-test="matrix-set-select"
              />
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="outlined" @click="cancelWmtsDialog"> Cancel </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!selectedLayer"
            data-test="apply-wmts-btn"
            @click="applyWmtsServer"
          >
            Apply
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Map Options Dialog -->
    <v-dialog
      v-model="optionsDialog"
      max-width="400"
      persistent
      @keydown.esc="optionsDialog = false"
    >
      <v-card>
        <v-toolbar height="48">
          <v-spacer />
          <span class="text-h6">Map Options</span>
          <v-spacer />
          <v-btn icon @click="optionsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <div class="pa-3">
            <v-text-field
              v-model.number="mapCenter.lon"
              type="number"
              step="0.0001"
              label="Center Longitude"
            />
            <v-text-field
              v-model.number="mapCenter.lat"
              type="number"
              step="0.0001"
              label="Center Latitude"
            />
            <v-text-field
              v-model.number="mapZoom"
              type="number"
              min="0"
              max="20"
              label="Zoom Level"
            />
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="outlined" @click="optionsDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" variant="flat" @click="applyMapOptions">
            Apply
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { TopBar } from '@openc3/vue-common/components'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import WMTS from 'ol/source/WMTS'
import WMTSCapabilities from 'ol/format/WMTSCapabilities'
import { optionsFromCapabilities } from 'ol/source/WMTS'
import { fromLonLat, toLonLat } from 'ol/proj'
import 'ol/ol.css'

const STORAGE_KEY_URL = 'mapServerUrl'
const STORAGE_KEY_LAYER = 'mapSelectedLayer'
const STORAGE_KEY_MATRIX = 'mapSelectedMatrix'

export default {
  components: {
    TopBar,
  },
  data() {
    return {
      title: 'Map',
      map: null,
      wmtsLayer: null,
      wmtsUrl: localStorage.getItem(STORAGE_KEY_URL) || '',
      wmtsUrlInput: localStorage.getItem(STORAGE_KEY_URL) || '',
      wmtsDialog: false,
      optionsDialog: false,
      loadingCapabilities: false,
      error: null,
      capabilities: null,
      availableLayers: [],
      selectedLayer: localStorage.getItem(STORAGE_KEY_LAYER) || '',
      selectedMatrixSet: localStorage.getItem(STORAGE_KEY_MATRIX) || '',
      mapCenter: { lat: 0, lon: 0 },
      mapZoom: 2,
      menus: [
        {
          label: 'File',
          items: [
            {
              label: 'Set WMTS Server',
              icon: 'mdi-server',
              command: () => {
                this.wmtsUrlInput = this.wmtsUrl
                this.wmtsDialog = true
                if (this.wmtsUrl && this.availableLayers.length === 0) {
                  this.fetchCapabilities()
                }
              },
            },
            {
              label: 'Map Options',
              icon: 'mdi-cog',
              command: () => {
                this.updateMapCenterFromView()
                this.optionsDialog = true
              },
            },
            {
              label: 'Reset View',
              icon: 'mdi-refresh',
              command: () => {
                this.resetMapView()
              },
            },
          ],
        },
      ],
    }
  },
  computed: {
    selectedLayerMatrixSets() {
      if (!this.selectedLayer || !this.capabilities) return []
      const layer = this.capabilities.Contents.Layer.find(
        (l) => l.Identifier === this.selectedLayer,
      )
      if (!layer) return []
      return layer.TileMatrixSetLink.map((link) => link.TileMatrixSet)
    },
  },
  watch: {
    selectedLayer(newVal) {
      if (newVal && this.selectedLayerMatrixSets.length > 0) {
        this.selectedMatrixSet = this.selectedLayerMatrixSets[0]
      }
    },
  },
  mounted() {
    this.initMap()
    if (this.wmtsUrl) {
      this.fetchCapabilities().then(() => {
        if (this.selectedLayer) {
          this.loadWmtsLayer()
        }
      })
    }
  },
  beforeUnmount() {
    if (this.map) {
      this.map.setTarget(null)
      this.map = null
    }
  },
  methods: {
    initMap() {
      this.map = new Map({
        target: this.$refs.mapContainer,
        view: new View({
          center: fromLonLat([this.mapCenter.lon, this.mapCenter.lat]),
          zoom: this.mapZoom,
        }),
      })

      this.map.on('moveend', () => {
        this.updateMapCenterFromView()
      })
    },
    updateMapCenterFromView() {
      if (!this.map) return
      const view = this.map.getView()
      const center = toLonLat(view.getCenter())
      this.mapCenter.lon = Number(center[0].toFixed(6))
      this.mapCenter.lat = Number(center[1].toFixed(6))
      this.mapZoom = Math.round(view.getZoom())
    },
    async fetchCapabilities() {
      if (!this.wmtsUrlInput) return

      this.loadingCapabilities = true
      this.error = null
      this.availableLayers = []

      try {
        const response = await fetch(this.wmtsUrlInput)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const text = await response.text()
        const parser = new WMTSCapabilities()
        this.capabilities = parser.read(text)

        if (
          this.capabilities &&
          this.capabilities.Contents &&
          this.capabilities.Contents.Layer
        ) {
          this.availableLayers = this.capabilities.Contents.Layer.map(
            (layer) => ({
              identifier: layer.Identifier,
              title: layer.Title || layer.Identifier,
            }),
          )

          if (
            this.selectedLayer &&
            this.availableLayers.some(
              (l) => l.identifier === this.selectedLayer,
            )
          ) {
            // Keep current selection
          } else if (this.availableLayers.length > 0) {
            this.selectedLayer = this.availableLayers[0].identifier
          }
        } else {
          throw new Error('Invalid WMTS capabilities response')
        }
      } catch (err) {
        this.error = `Failed to fetch WMTS capabilities: ${err.message}`
        console.error('WMTS capabilities error:', err)
      } finally {
        this.loadingCapabilities = false
      }
    },
    loadWmtsLayer() {
      if (!this.capabilities || !this.selectedLayer) return

      try {
        const options = optionsFromCapabilities(this.capabilities, {
          layer: this.selectedLayer,
          matrixSet: this.selectedMatrixSet || undefined,
        })

        if (!options) {
          this.error = `Could not create WMTS options for layer: ${this.selectedLayer}`
          return
        }

        if (this.wmtsLayer) {
          this.map.removeLayer(this.wmtsLayer)
        }

        this.wmtsLayer = new TileLayer({
          source: new WMTS(options),
        })

        this.map.addLayer(this.wmtsLayer)
        this.error = null
      } catch (err) {
        this.error = `Failed to load WMTS layer: ${err.message}`
        console.error('WMTS layer error:', err)
      }
    },
    applyWmtsServer() {
      this.wmtsUrl = this.wmtsUrlInput
      localStorage.setItem(STORAGE_KEY_URL, this.wmtsUrl)
      localStorage.setItem(STORAGE_KEY_LAYER, this.selectedLayer)
      localStorage.setItem(STORAGE_KEY_MATRIX, this.selectedMatrixSet)
      this.loadWmtsLayer()
      this.wmtsDialog = false
    },
    cancelWmtsDialog() {
      this.wmtsUrlInput = this.wmtsUrl
      this.wmtsDialog = false
    },
    applyMapOptions() {
      if (this.map) {
        const view = this.map.getView()
        view.animate({
          center: fromLonLat([this.mapCenter.lon, this.mapCenter.lat]),
          zoom: this.mapZoom,
          duration: 500,
        })
      }
      this.optionsDialog = false
    },
    resetMapView() {
      if (this.map) {
        const view = this.map.getView()
        view.animate({
          center: fromLonLat([0, 0]),
          zoom: 2,
          duration: 500,
        })
      }
    },
  },
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 48px);
  background-color: #1a1a2e;
}

.map {
  width: 100%;
  height: 100%;
}

.map.hidden {
  visibility: hidden;
}

.no-server-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.no-server-message p {
  margin: 0;
}
</style>
