<!--
# Copyright 2026 Clay Kramp
# All Rights Reserved.
-->

<template>
  <div>
    <top-bar :menus="menus" :title="title" />
    <div class="map-container">
      <v-alert v-if="error" type="error" closable class="ma-4">
        {{ error }}
      </v-alert>
      <div v-if="!mapUrl" class="no-server-message">
        <v-icon size="64" class="mb-4">mdi-map-marker-question</v-icon>
        <p>No map server configured</p>
        <p class="text-caption">
          Use File &rarr; Set Map Server to configure a WMTS or TMS endpoint
        </p>
      </div>
      <div ref="mapContainer" class="map" :class="{ hidden: !mapUrl }"></div>
      <div ref="tooltip" class="map-tooltip"></div>
    </div>

    <!-- Set Map Server Dialog -->
    <v-dialog
      v-model="serverDialog"
      max-width="600"
      persistent
      @keydown.esc="cancelServerDialog"
    >
      <v-card>
        <v-toolbar height="48">
          <v-spacer />
          <span class="text-h6">Set Map Server</span>
          <v-spacer />
          <v-btn icon data-test="close-dialog" @click="cancelServerDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <div class="pa-3">
            <v-select
              v-model="selectedType"
              :items="serviceTypes"
              label="Service Type"
              data-test="type-select"
              class="mb-3"
            />

            <!-- WMTS Configuration -->
            <div v-if="selectedType === 'wmts'">
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
                <v-autocomplete
                  v-model="selectedLayer"
                  :items="availableLayers"
                  item-title="title"
                  item-value="identifier"
                  label="Select Layer"
                  data-test="layer-select"
                  auto-select-first
                  clearable
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

            <!-- TMS/XYZ Configuration -->
            <div v-if="selectedType === 'tms'">
              <v-text-field
                v-model="tmsUrlInput"
                label="TMS Tile URL Template"
                placeholder="https://tiles.example.com/{z}/{x}/{y}.png"
                hint="Use {z}, {x}, {y} placeholders for zoom, column, row"
                persistent-hint
                data-test="tms-url-input"
              />
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="outlined" @click="cancelServerDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!canApply"
            data-test="apply-btn"
            @click="applyServer"
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

    <!-- Track Dialogs -->
    <add-track-dialog
      v-model="addTrackDialog"
      :tracks="tracks"
      :edit-track="editTrackData"
      @create="createTrack"
      @update="updateTrack"
    />
    <tracks-dialog
      v-model="tracksDialog"
      :tracks="tracks"
      @delete="deleteTrack"
      @edit="editTrack"
    />

    <!-- Marker Dialogs -->
    <add-marker-dialog
      v-model="addMarkerDialog"
      :markers="markers"
      :edit-marker="editMarkerData"
      @create="createMarker"
      @update="updateMarker"
    />
    <markers-dialog
      v-model="markersDialog"
      :markers="markers"
      @delete="deleteMarker"
      @edit="editMarker"
    />

    <!-- Config Dialogs -->
    <open-config-dialog
      v-if="showOpenConfig"
      v-model="showOpenConfig"
      :config-key="configKey"
      @success="openConfiguration"
    />
    <save-config-dialog
      v-if="showSaveConfig"
      v-model="showSaveConfig"
      :config-key="configKey"
      @success="saveConfiguration"
    />
  </div>
</template>

<script>
import { Cable } from '@openc3/js-common/services'
import {
  Config,
  TopBar,
  OpenConfigDialog,
  SaveConfigDialog,
} from '@openc3/vue-common/components'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import Overlay from 'ol/Overlay'
import 'ol/ol.css'

import {
  fetchWmtsCapabilities,
  getLayerMatrixSets,
  createWmtsSource,
} from './wmts.js'
import { createTmsSource } from './tms.js'
import {
  createTrackLayer,
  updateTrackPosition,
  clearTrack,
  buildTelemetryKey,
} from './track.js'
import { createMarkerLayer } from './marker.js'
import AddTrackDialog from './AddTrackDialog.vue'
import TracksDialog from './TracksDialog.vue'
import AddMarkerDialog from './AddMarkerDialog.vue'
import MarkersDialog from './MarkersDialog.vue'

const STORAGE_KEY_TYPE = 'mapServiceType'
const STORAGE_KEY_URL = 'mapServerUrl'
const STORAGE_KEY_LAYER = 'mapSelectedLayer'
const STORAGE_KEY_MATRIX = 'mapSelectedMatrix'
const STORAGE_KEY_TMS = 'mapTmsUrl'

const DEFAULT_PROJECTION = 'EPSG:4326'
const DEFAULT_CENTER = [0, 0]
const DEFAULT_ZOOM = 2

export default {
  components: {
    TopBar,
    AddTrackDialog,
    TracksDialog,
    AddMarkerDialog,
    MarkersDialog,
    OpenConfigDialog,
    SaveConfigDialog,
  },
  mixins: [Config],
  data() {
    return {
      title: 'Map',
      configKey: 'map',
      showOpenConfig: false,
      showSaveConfig: false,
      map: null,
      tileLayer: null,
      tooltipOverlay: null,
      serverDialog: false,
      optionsDialog: false,
      loadingCapabilities: false,
      error: null,

      // Service configuration
      serviceTypes: ['wmts', 'tms'],
      selectedType: localStorage.getItem(STORAGE_KEY_TYPE) || 'tms',
      activeType: localStorage.getItem(STORAGE_KEY_TYPE) || 'tms',

      // WMTS
      wmtsUrlInput: localStorage.getItem(STORAGE_KEY_URL) || '',
      wmtsUrl: localStorage.getItem(STORAGE_KEY_URL) || '',
      capabilities: null,
      availableLayers: [],
      selectedLayer: localStorage.getItem(STORAGE_KEY_LAYER) || '',
      selectedMatrixSet: localStorage.getItem(STORAGE_KEY_MATRIX) || '',

      // TMS
      tmsUrlInput: localStorage.getItem(STORAGE_KEY_TMS) || '',
      tmsUrl: localStorage.getItem(STORAGE_KEY_TMS) || '',

      // Map state
      mapCenter: { lat: 0, lon: 0 },
      mapZoom: 2,

      // Tracks
      addTrackDialog: false,
      tracksDialog: false,
      tracks: [],
      editTrackData: null,
      trackLayers: {}, // Map of track name to {layer, track}
      cable: new Cable(),
      subscription: null,

      // Markers
      addMarkerDialog: false,
      markersDialog: false,
      markers: [],
      editMarkerData: null,
      markerLayers: {}, // Map of marker name to {layer, source}

      menus: [
        {
          label: 'File',
          items: [
            {
              label: 'Open Configuration',
              icon: 'mdi-folder-open',
              command: () => {
                this.showOpenConfig = true
              },
            },
            {
              label: 'Save Configuration',
              icon: 'mdi-content-save',
              command: () => {
                this.showSaveConfig = true
              },
            },
            {
              label: 'Reset Configuration',
              icon: 'mdi-monitor-shimmer',
              command: () => {
                this.resetConfiguration()
              },
            },
            {
              divider: true,
            },
            {
              label: 'Set Map Server',
              icon: 'mdi-server',
              command: () => {
                this.wmtsUrlInput = this.wmtsUrl
                this.tmsUrlInput = this.tmsUrl
                this.selectedType = this.activeType
                this.serverDialog = true
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
        {
          label: 'Map',
          items: [
            {
              label: 'Add Track',
              icon: 'mdi-map-marker-path',
              command: () => {
                this.editTrackData = null
                this.addTrackDialog = true
              },
            },
            {
              label: 'View Tracks',
              icon: 'mdi-eye',
              command: () => {
                this.tracksDialog = true
              },
            },
            {
              divider: true,
            },
            {
              label: 'Add Marker',
              icon: 'mdi-map-marker-plus',
              command: () => {
                this.editMarkerData = null
                this.addMarkerDialog = true
              },
            },
            {
              label: 'View Markers',
              icon: 'mdi-map-marker-multiple',
              command: () => {
                this.markersDialog = true
              },
            },
            {
              divider: true,
            },
            {
              label: 'Clear All Tracks',
              icon: 'mdi-delete-sweep',
              command: () => {
                this.clearAllTracks()
              },
            },
            {
              label: 'Clear All Markers',
              icon: 'mdi-map-marker-off',
              command: () => {
                this.clearAllMarkers()
              },
            },
          ],
        },
      ],
    }
  },
  computed: {
    mapUrl() {
      return this.activeType === 'wmts' ? this.wmtsUrl : this.tmsUrl
    },
    canApply() {
      if (this.selectedType === 'wmts') {
        return this.selectedLayer && this.wmtsUrlInput
      }
      return !!this.tmsUrlInput
    },
    selectedLayerMatrixSets() {
      return getLayerMatrixSets(this.capabilities, this.selectedLayer)
    },
    currentConfig() {
      return {
        mapServer: {
          type: this.activeType,
          wmts: {
            url: this.wmtsUrl,
            layer: this.selectedLayer,
            matrixSet: this.selectedMatrixSet,
          },
          tms: {
            url: this.tmsUrl,
          },
        },
        tracks: this.tracks.map((track) => ({
          name: track.name,
          targetName: track.targetName,
          packetName: track.packetName,
          latItem: track.latItem,
          lonItem: track.lonItem,
          color: track.color,
          trailTime: track.trailTime,
          startDate: track.startDate,
          startTime: track.startTime,
          endDate: track.endDate,
          endTime: track.endTime,
          timeZone: track.timeZone,
          start_time: track.start_time,
          end_time: track.end_time,
        })),
        markers: this.markers.map((marker) => ({
          name: marker.name,
          lat: marker.lat,
          lon: marker.lon,
          icon: marker.icon,
          color: marker.color,
          showLabel: marker.showLabel,
        })),
      }
    },
  },
  watch: {
    selectedLayer(newVal) {
      if (newVal && this.selectedLayerMatrixSets.length > 0) {
        this.selectedMatrixSet = this.selectedLayerMatrixSets[0]
      }
    },
  },
  created() {
    this.initSubscription()
  },
  mounted() {
    this.initMap()
    if (this.mapUrl) {
      if (this.activeType === 'wmts' && this.wmtsUrl) {
        this.fetchCapabilities().then(() => {
          if (this.selectedLayer) {
            this.loadLayer()
          }
        })
      } else if (this.activeType === 'tms' && this.tmsUrl) {
        this.loadLayer()
      }
    }

    // Load config from URL if specified (e.g., /tools/map?config=myconfig)
    // Delay to ensure OpenC3Auth and subscription are initialized
    if (this.$route.query && this.$route.query.config) {
      setTimeout(() => {
        this.openConfiguration(this.$route.query.config, true)
      }, 1000)
    }
  },
  beforeUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
    this.cable.disconnect()
    if (this.map) {
      this.map.setTarget(null)
      this.map = null
    }
  },
  methods: {
    // Subscription methods
    initSubscription() {
      this.cable
        .createSubscription('StreamingChannel', localStorage.scope, {
          received: (data) => this.received(data),
          disconnected: () => {
            console.warn('Backend connection disconnected')
          },
          rejected: () => {
            console.warn('Backend connection rejected')
          },
        })
        .then((subscription) => {
          this.subscription = subscription
        })
    },
    received(data) {
      // Empty data means historical playback finished - just return without unsubscribing
      // The subscription stays active for real-time data or other tracks
      if (!data || data.length === 0) {
        return
      }

      data.forEach((event) => {
        this.updateTracks(event)
      })
    },
    updateTracks(event) {
      const properties = Object.keys(event)

      this.tracks.forEach((track) => {
        const latKey = buildTelemetryKey(
          track.targetName,
          track.packetName,
          track.latItem,
        )
        const lonKey = buildTelemetryKey(
          track.targetName,
          track.packetName,
          track.lonItem,
        )

        if (properties.includes(latKey) && properties.includes(lonKey)) {
          const lat = event[latKey]
          const lon = event[lonKey]
          const timestamp = event.__time

          const trackData = this.trackLayers[track.name]
          if (trackData) {
            updateTrackPosition(trackData.track, lon, lat, timestamp)
          }
        }
      })
    },
    // Track methods
    createTrack(config) {
      const track = createTrackLayer(config.color, config.trailTime)

      // Add layer to map
      this.map.addLayer(track.layer)

      // Store track data
      this.trackLayers[config.name] = { layer: track.layer, track }
      this.tracks.push(config)

      // Subscribe to telemetry with time range
      this.subscribeToTrack(config)
    },
    editTrack(config) {
      this.editTrackData = config
      this.tracksDialog = false
      this.addTrackDialog = true
    },
    async updateTrack(config) {
      // Find existing track
      const existingIndex = this.tracks.findIndex((t) => t.name === config.name)
      if (existingIndex === -1) return

      const oldConfig = this.tracks[existingIndex]
      const trackData = this.trackLayers[config.name]

      // Unsubscribe from old telemetry
      await this.unsubscribeFromTrack(oldConfig)

      // Remove old layer
      if (trackData) {
        this.map.removeLayer(trackData.layer)
      }

      // Create new track layer with updated settings
      const track = createTrackLayer(config.color, config.trailTime)
      this.map.addLayer(track.layer)
      this.trackLayers[config.name] = { layer: track.layer, track }

      // Update config in tracks array
      this.tracks.splice(existingIndex, 1, config)

      // Small delay to ensure unsubscribe completes on server before re-subscribing
      await new Promise((resolve) => setTimeout(resolve, 250))

      // Subscribe with new time range
      this.subscribeToTrack(config)

      this.editTrackData = null
    },
    subscribeToTrack(config) {
      const items = [
        buildTelemetryKey(config.targetName, config.packetName, config.latItem),
        buildTelemetryKey(config.targetName, config.packetName, config.lonItem),
      ]

      OpenC3Auth.updateToken(OpenC3Auth.defaultMinValidity).then(() => {
        OpenC3Auth.setTokens()
        const payload = {
          scope: window.openc3Scope,
          token: localStorage.openc3Token,
          mode: 'DECOM',
          items,
        }
        // Add time range if specified
        if (config.start_time) {
          payload.start_time = config.start_time
        }
        if (config.end_time) {
          payload.end_time = config.end_time
        }
        this.subscription.perform('add', payload)
      })
    },
    async unsubscribeFromTrack(config) {
      if (!this.subscription) {
        return
      }

      const items = [
        buildTelemetryKey(config.targetName, config.packetName, config.latItem),
        buildTelemetryKey(config.targetName, config.packetName, config.lonItem),
      ]

      await OpenC3Auth.updateToken(OpenC3Auth.defaultMinValidity)
      OpenC3Auth.setTokens()
      this.subscription.perform('remove', {
        scope: window.openc3Scope,
        token: localStorage.openc3Token,
        items,
      })
    },
    deleteTrack(config) {
      const trackData = this.trackLayers[config.name]
      if (trackData) {
        // Remove layer from map
        this.map.removeLayer(trackData.layer)
        // Unsubscribe from telemetry
        this.unsubscribeFromTrack(config)
        // Clean up layer reference
        delete this.trackLayers[config.name]
      }

      // Always remove from tracks array
      const index = this.tracks.findIndex((t) => t.name === config.name)
      if (index !== -1) {
        this.tracks.splice(index, 1)
      }
    },
    clearAllTracks() {
      const trackNames = [...this.tracks.map((t) => t.name)]
      trackNames.forEach((name) => {
        const config = this.tracks.find((t) => t.name === name)
        if (config) {
          this.deleteTrack(config)
        }
      })
    },

    // Marker methods
    createMarker(config) {
      const { layer, source } = createMarkerLayer(config)

      // Add layer to map
      this.map.addLayer(layer)

      // Store marker data
      this.markerLayers[config.name] = { layer, source }
      this.markers.push(config)
    },
    editMarker(config) {
      this.editMarkerData = config
      this.markersDialog = false
      this.addMarkerDialog = true
    },
    updateMarker(config) {
      // Find existing marker
      const existingIndex = this.markers.findIndex(
        (m) => m.name === config.name,
      )
      if (existingIndex === -1) return

      const markerData = this.markerLayers[config.name]

      // Remove old layer
      if (markerData) {
        this.map.removeLayer(markerData.layer)
      }

      // Create new marker layer with updated settings
      const { layer, source } = createMarkerLayer(config)
      this.map.addLayer(layer)
      this.markerLayers[config.name] = { layer, source }

      // Update config in markers array
      this.markers.splice(existingIndex, 1, config)

      this.editMarkerData = null
    },
    deleteMarker(config) {
      const markerData = this.markerLayers[config.name]
      if (markerData) {
        // Remove layer from map
        this.map.removeLayer(markerData.layer)
        // Clean up layer reference
        delete this.markerLayers[config.name]
      }

      // Always remove from markers array
      const index = this.markers.findIndex((m) => m.name === config.name)
      if (index !== -1) {
        this.markers.splice(index, 1)
      }
    },
    clearAllMarkers() {
      const markerNames = [...this.markers.map((m) => m.name)]
      markerNames.forEach((name) => {
        const config = this.markers.find((m) => m.name === name)
        if (config) {
          this.deleteMarker(config)
        }
      })
    },

    // Map methods
    initMap() {
      this.map = new Map({
        target: this.$refs.mapContainer,
        view: new View({
          projection: DEFAULT_PROJECTION,
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          extent: [-180, -90, 180, 90], // Restrict panning to world bounds
          minZoom: 1, // Prevent zooming out too far
        }),
      })

      this.map.on('moveend', () => {
        this.updateMapCenterFromView()
      })

      // Create tooltip overlay
      this.tooltipOverlay = new Overlay({
        element: this.$refs.tooltip,
        positioning: 'bottom-center',
        offset: [0, -10],
        stopEvent: false,
      })
      this.map.addOverlay(this.tooltipOverlay)

      // Add pointermove event for tooltips
      this.map.on('pointermove', (evt) => {
        if (evt.dragging) {
          this.hideTooltip()
          return
        }
        this.handlePointerMove(evt)
      })
    },
    updateMapCenterFromView() {
      if (!this.map) return
      const view = this.map.getView()
      const center = view.getCenter()
      if (center) {
        this.mapCenter.lon = Number(center[0].toFixed(6))
        this.mapCenter.lat = Number(center[1].toFixed(6))
      }
      const zoom = view.getZoom()
      if (zoom !== undefined) {
        this.mapZoom = Math.round(zoom)
      }
    },
    handlePointerMove(evt) {
      const pixel = evt.pixel
      let foundFeature = false

      this.map.forEachFeatureAtPixel(
        pixel,
        (feature) => {
          // Check if this is the current position feature (has positionData directly)
          const positionData = feature.get('positionData')
          if (positionData) {
            this.showPositionTooltip(positionData, evt.coordinate)
            foundFeature = true
            return true
          }

          // Check if this is a waypoints feature (has positions array)
          const positions = feature.get('positions')
          if (positions && positions.length > 0) {
            // Find the closest position to the cursor
            const coord = evt.coordinate
            let closestPos = null
            let minDist = Infinity

            for (const pos of positions) {
              const dx = pos.lon - coord[0]
              const dy = pos.lat - coord[1]
              const dist = dx * dx + dy * dy
              if (dist < minDist) {
                minDist = dist
                closestPos = pos
              }
            }

            if (closestPos) {
              this.showPositionTooltip(closestPos, evt.coordinate)
              foundFeature = true
              return true
            }
          }
        },
        { hitTolerance: 5 },
      )

      if (!foundFeature) {
        this.hideTooltip()
      }
    },
    showPositionTooltip(positionData, coordinate) {
      const { lon, lat, time } = positionData
      const date = new Date(time)
      const timeStr = date.toISOString().replace('T', ' ').replace('Z', ' UTC')

      this.$refs.tooltip.innerHTML = `
        <div><strong>Time:</strong> ${timeStr}</div>
        <div><strong>Lat:</strong> ${lat.toFixed(6)}</div>
        <div><strong>Lon:</strong> ${lon.toFixed(6)}</div>
      `
      this.tooltipOverlay.setPosition(coordinate)
    },
    hideTooltip() {
      this.tooltipOverlay.setPosition(undefined)
    },
    async fetchCapabilities() {
      if (!this.wmtsUrlInput) return

      this.loadingCapabilities = true
      this.error = null
      this.availableLayers = []

      try {
        const { capabilities, layers } = await fetchWmtsCapabilities(
          this.wmtsUrlInput,
        )
        this.capabilities = capabilities
        this.availableLayers = layers

        if (
          this.selectedLayer &&
          this.availableLayers.some((l) => l.identifier === this.selectedLayer)
        ) {
          // Keep current selection
        } else if (this.availableLayers.length > 0) {
          this.selectedLayer = this.availableLayers[0].identifier
        }
      } catch (err) {
        this.error = `Failed to fetch WMTS capabilities: ${err.message}`
        console.error('WMTS capabilities error:', err)
      } finally {
        this.loadingCapabilities = false
      }
    },
    loadLayer() {
      try {
        if (this.activeType === 'wmts') {
          this.loadWmtsLayer()
        } else {
          this.loadTmsLayer()
        }
      } catch (err) {
        this.error = `Failed to load layer: ${err.message}`
        console.error('Layer load error:', err)
      }
    },
    loadWmtsLayer() {
      if (!this.capabilities || !this.selectedLayer) return

      const wmtsSource = createWmtsSource(
        this.capabilities,
        this.selectedLayer,
        this.selectedMatrixSet,
      )
      this.setTileLayer(wmtsSource)
    },
    loadTmsLayer() {
      if (!this.tmsUrl) return
      const source = createTmsSource(this.tmsUrl)
      this.setTileLayer(source)
    },
    setTileLayer(source) {
      if (this.tileLayer) {
        this.map.removeLayer(this.tileLayer)
      }

      this.tileLayer = new TileLayer({ source })
      this.map.getLayers().insertAt(0, this.tileLayer) // Insert at bottom
      this.error = null
    },
    applyServer() {
      this.activeType = this.selectedType

      localStorage.setItem(STORAGE_KEY_TYPE, this.selectedType)

      if (this.selectedType === 'wmts') {
        this.wmtsUrl = this.wmtsUrlInput
        localStorage.setItem(STORAGE_KEY_URL, this.wmtsUrl)
        localStorage.setItem(STORAGE_KEY_LAYER, this.selectedLayer)
        localStorage.setItem(STORAGE_KEY_MATRIX, this.selectedMatrixSet)
      } else {
        this.tmsUrl = this.tmsUrlInput
        localStorage.setItem(STORAGE_KEY_TMS, this.tmsUrl)
      }

      this.loadLayer()
      this.serverDialog = false
    },
    cancelServerDialog() {
      this.wmtsUrlInput = this.wmtsUrl
      this.tmsUrlInput = this.tmsUrl
      this.selectedType = this.activeType
      this.serverDialog = false
    },
    applyMapOptions() {
      if (this.map) {
        const view = this.map.getView()
        view.animate({
          center: [this.mapCenter.lon, this.mapCenter.lat],
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
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          duration: 500,
        })
      }
    },

    // Configuration methods
    openConfiguration(name, routed = false) {
      this.openConfigBase(name, routed, (config) => {
        this.applyConfig(config)
      })
    },
    saveConfiguration(name) {
      this.saveConfigBase(name, this.currentConfig)
    },
    resetConfiguration() {
      this.resetConfigBase()
      // Clear all tracks and markers
      this.clearAllTracks()
      this.clearAllMarkers()
      // Reset map server settings
      this.activeType = 'tms'
      this.wmtsUrl = ''
      this.wmtsUrlInput = ''
      this.tmsUrl = ''
      this.tmsUrlInput = ''
      this.selectedLayer = ''
      this.selectedMatrixSet = ''
      this.capabilities = null
      this.availableLayers = []
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY_TYPE)
      localStorage.removeItem(STORAGE_KEY_URL)
      localStorage.removeItem(STORAGE_KEY_LAYER)
      localStorage.removeItem(STORAGE_KEY_MATRIX)
      localStorage.removeItem(STORAGE_KEY_TMS)
      // Remove tile layer
      if (this.tileLayer) {
        this.map.removeLayer(this.tileLayer)
        this.tileLayer = null
      }
      this.resetMapView()
    },
    async applyConfig(config) {
      // Ensure map is ready
      if (!this.map) {
        console.error('Map not initialized, cannot apply config')
        return
      }

      // Clear existing tracks and markers first
      this.clearAllTracks()
      this.clearAllMarkers()

      // Apply map server settings
      if (config.mapServer) {
        const { type, wmts, tms } = config.mapServer
        this.activeType = type
        this.selectedType = type

        if (type === 'wmts' && wmts) {
          this.wmtsUrl = wmts.url || ''
          this.wmtsUrlInput = wmts.url || ''
          this.selectedLayer = wmts.layer || ''
          this.selectedMatrixSet = wmts.matrixSet || ''

          if (this.wmtsUrl) {
            await this.fetchCapabilities()
            if (this.selectedLayer) {
              this.loadLayer()
            }
          }
        } else if (type === 'tms' && tms) {
          this.tmsUrl = tms.url || ''
          this.tmsUrlInput = tms.url || ''

          if (this.tmsUrl) {
            this.loadLayer()
          }
        }

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY_TYPE, type)
        if (type === 'wmts') {
          localStorage.setItem(STORAGE_KEY_URL, this.wmtsUrl)
          localStorage.setItem(STORAGE_KEY_LAYER, this.selectedLayer)
          localStorage.setItem(STORAGE_KEY_MATRIX, this.selectedMatrixSet)
        } else {
          localStorage.setItem(STORAGE_KEY_TMS, this.tmsUrl)
        }
      }

      // Apply tracks
      if (config.tracks && config.tracks.length > 0) {
        for (const trackConfig of config.tracks) {
          // Recreate the start_time and end_time from date/time strings
          const fullConfig = { ...trackConfig }
          this.createTrack(fullConfig)
        }
      }

      // Apply markers
      if (config.markers && config.markers.length > 0) {
        for (const markerConfig of config.markers) {
          this.createMarker(markerConfig)
        }
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

.map-tooltip {
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.map-tooltip div {
  line-height: 1.4;
}
</style>
