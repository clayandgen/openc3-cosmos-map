<!--
# Copyright 2026 OpenC3, Inc.
# All Rights Reserved.
#
# This file may also be used under the terms of a commercial license
# if purchased from OpenC3, Inc.
-->

<template>
  <v-dialog v-model="show" persistent width="500">
    <v-card>
      <v-toolbar height="48">
        <v-spacer />
        <span class="text-h6">{{ isEdit ? 'Edit Marker' : 'Add Marker' }}</span>
        <v-spacer />
        <v-btn icon @click="cancel">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-alert
          v-if="validationError"
          type="error"
          density="compact"
          class="mb-4"
        >
          {{ validationError }}
        </v-alert>

        <v-text-field
          v-model="markerName"
          label="Marker Name"
          hint="Unique name for this marker"
          persistent-hint
          :disabled="isEdit"
          data-test="marker-name"
          class="mb-4"
        />

        <v-row>
          <v-col cols="6">
            <v-text-field
              v-model.number="latitude"
              type="number"
              step="0.0001"
              label="Latitude"
              hint="-90 to 90"
              persistent-hint
              data-test="marker-lat"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="longitude"
              type="number"
              step="0.0001"
              label="Longitude"
              hint="-180 to 180"
              persistent-hint
              data-test="marker-lon"
            />
          </v-col>
        </v-row>

        <div class="text-subtitle-2 mt-4 mb-2">Icon</div>
        <v-item-group v-model="selectedIcon" mandatory>
          <v-row>
            <v-col
              v-for="icon in markerIcons"
              :key="icon.id"
              cols="3"
              class="pa-1"
            >
              <v-item v-slot="{ isSelected, toggle }" :value="icon.id">
                <v-card
                  :color="isSelected ? 'primary' : 'surface'"
                  class="d-flex flex-column align-center pa-2"
                  height="70"
                  variant="outlined"
                  @click="toggle"
                >
                  <v-icon :color="isSelected ? 'white' : color" size="28">
                    mdi-{{ icon.id }}
                  </v-icon>
                  <span class="text-caption mt-1 text-white">
                    {{ icon.label }}
                  </span>
                </v-card>
              </v-item>
            </v-col>
          </v-row>
        </v-item-group>

        <div class="text-subtitle-2 mt-4 mb-2">Color</div>
        <v-color-picker
          v-model="color"
          hide-canvas
          hide-mode-switch
          show-swatches
          :swatches="swatches"
          width="100%"
          swatches-max-height="100"
        />

        <v-checkbox
          v-model="showLabel"
          label="Show label on map"
          hide-details
          class="mt-2"
        />
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="outlined" @click="cancel">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!!validationError"
          data-test="create-marker-btn"
          @click="submit"
        >
          {{ isEdit ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { MARKER_ICONS } from './marker.js'

export default {
  props: {
    modelValue: Boolean,
    markers: {
      type: Array,
      default: () => [],
    },
    editMarker: {
      type: Object,
      default: null,
    },
  },
  emits: ['update:modelValue', 'create', 'update'],
  data() {
    return {
      markerName: '',
      latitude: 0,
      longitude: 0,
      selectedIcon: 'satellite-dish',
      color: '#FF0000',
      showLabel: true,
      markerIcons: MARKER_ICONS,
      swatches: [
        ['#FF0000', '#AA0000', '#550000'],
        ['#FFFF00', '#AAAA00', '#555500'],
        ['#00FF00', '#00AA00', '#005500'],
        ['#00FFFF', '#00AAAA', '#005555'],
        ['#0000FF', '#0000AA', '#000055'],
      ],
    }
  },
  computed: {
    show: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      },
    },
    isEdit() {
      return this.editMarker !== null
    },
    validationError() {
      if (!this.markerName) return 'Marker name is required'
      if (!this.isEdit && this.markers.some((m) => m.name === this.markerName)) {
        return 'Marker name already exists'
      }
      if (this.latitude < -90 || this.latitude > 90) {
        return 'Latitude must be between -90 and 90'
      }
      if (this.longitude < -180 || this.longitude > 180) {
        return 'Longitude must be between -180 and 180'
      }
      return null
    },
    markerConfig() {
      return {
        name: this.markerName,
        lat: this.latitude,
        lon: this.longitude,
        icon: this.selectedIcon,
        color: this.color,
        showLabel: this.showLabel,
      }
    },
  },
  watch: {
    modelValue(newVal) {
      if (newVal) {
        this.initializeForm()
      }
    },
  },
  created() {
    this.initializeForm()
  },
  methods: {
    initializeForm() {
      if (this.editMarker) {
        this.markerName = this.editMarker.name
        this.latitude = this.editMarker.lat
        this.longitude = this.editMarker.lon
        this.selectedIcon = this.editMarker.icon || 'satellite-dish'
        this.color = this.editMarker.color || '#FF0000'
        this.showLabel = this.editMarker.showLabel !== false
      } else {
        this.reset()
      }
    },
    cancel() {
      this.reset()
      this.show = false
    },
    submit() {
      if (this.isEdit) {
        this.$emit('update', this.markerConfig)
      } else {
        this.$emit('create', this.markerConfig)
      }
      this.reset()
      this.show = false
    },
    reset() {
      this.markerName = ''
      this.latitude = 0
      this.longitude = 0
      this.selectedIcon = 'satellite-dish'
      this.color = '#FF0000'
      this.showLabel = true
    },
  },
}
</script>
