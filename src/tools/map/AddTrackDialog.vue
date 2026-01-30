<!--
# Copyright 2026 OpenC3, Inc.
# All Rights Reserved.
#
# This file may also be used under the terms of a commercial license
# if purchased from OpenC3, Inc.
-->

<template>
  <v-dialog v-model="show" persistent width="600">
    <v-card>
      <v-toolbar height="48">
        <v-spacer />
        <span class="text-h6">{{ isEdit ? 'Edit Track' : 'Add Track' }}</span>
        <v-spacer />
        <v-btn icon @click="cancel">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-stepper v-model="step" alt-labels flat>
        <v-stepper-header>
          <v-stepper-item title="Source" :value="1" />
          <v-divider />
          <v-stepper-item title="Time Range" :value="2" />
          <v-divider />
          <v-stepper-item title="Options" :value="3" />
          <v-divider />
          <v-stepper-item title="Review" :value="4" />
        </v-stepper-header>

        <v-stepper-window>
          <!-- Step 1: Source -->
          <v-stepper-window-item :value="1">
            <v-card-text>
              <v-alert
                v-if="stepOneError"
                type="error"
                density="compact"
                class="mb-4"
              >
                {{ stepOneError }}
              </v-alert>

              <v-text-field
                v-model="trackName"
                label="Track Name"
                hint="Unique name for this track"
                persistent-hint
                :disabled="isEdit"
                data-test="track-name"
                class="mb-4"
              />

              <target-packet-item-chooser
                v-if="!isEdit"
                @on-set="targetPacketChanged($event)"
              />

              <div v-if="isEdit" class="mb-4">
                <v-text-field
                  :model-value="selectedTargetName"
                  label="Target"
                  disabled
                />
                <v-text-field
                  :model-value="selectedPacketName"
                  label="Packet"
                  disabled
                />
              </div>

              <div class="mt-4">
                <v-autocomplete
                  v-model="selectedLatItem"
                  :items="itemNames"
                  label="Latitude Item"
                  data-test="lat-item"
                  hide-details
                  :disabled="isEdit"
                  class="mb-3"
                />

                <v-autocomplete
                  v-model="selectedLonItem"
                  :items="itemNames"
                  label="Longitude Item"
                  data-test="lon-item"
                  hide-details
                  :disabled="isEdit"
                />
              </div>
            </v-card-text>

            <v-card-actions class="px-4 pb-4">
              <v-spacer />
              <v-btn variant="outlined" @click="cancel">Cancel</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                :disabled="!!stepOneError"
                @click="step = 2"
              >
                Next
              </v-btn>
            </v-card-actions>
          </v-stepper-window-item>

          <!-- Step 2: Time Range -->
          <v-stepper-window-item :value="2">
            <v-card-text>
              <v-alert type="info" density="compact" class="mb-4">
                Leave end date/time empty for real-time streaming.
                Times are in {{ timeZone === 'UTC' ? 'UTC' : 'local' }} timezone.
              </v-alert>

              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="startDate"
                    label="Start Date"
                    type="date"
                    data-test="start-date"
                  />
                </v-col>
                <v-col cols="6">
                  <open-c3-time-picker
                    v-model="startTime"
                    label="Start Time"
                    data-test="start-time"
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="endDate"
                    label="End Date"
                    type="date"
                    clearable
                    data-test="end-date"
                  />
                </v-col>
                <v-col cols="6">
                  <open-c3-time-picker
                    v-model="endTime"
                    label="End Time"
                    clearable
                    data-test="end-time"
                  />
                </v-col>
              </v-row>
            </v-card-text>

            <v-card-actions class="px-4 pb-4">
              <v-spacer />
              <v-btn variant="outlined" @click="step = 1">Back</v-btn>
              <v-btn color="primary" variant="flat" @click="step = 3">
                Next
              </v-btn>
            </v-card-actions>
          </v-stepper-window-item>

          <!-- Step 3: Options -->
          <v-stepper-window-item :value="3">
            <v-card-text>
              <div class="text-subtitle-2 mb-2">Track Color</div>
              <v-row align="center" justify="center">
                <v-color-picker
                  v-model="color"
                  hide-canvas
                  hide-mode-switch
                  show-swatches
                  :swatches="swatches"
                  width="100%"
                  swatches-max-height="100"
                />
              </v-row>

              <v-text-field
                v-model.number="trailTime"
                type="number"
                label="Trail Time (seconds)"
                hint="How many seconds of track history to display"
                persistent-hint
                :min="0"
                :max="86400"
                class="mt-4"
                data-test="trail-time"
              />
            </v-card-text>

            <v-card-actions class="px-4 pb-4">
              <v-spacer />
              <v-btn variant="outlined" @click="step = 2">Back</v-btn>
              <v-btn color="primary" variant="flat" @click="step = 4">
                Next
              </v-btn>
            </v-card-actions>
          </v-stepper-window-item>

          <!-- Step 4: Review -->
          <v-stepper-window-item :value="4">
            <v-card-text>
              <v-textarea
                readonly
                rows="12"
                :model-value="JSON.stringify(trackConfigDisplay, null, 2)"
                label="Track Configuration"
              />
            </v-card-text>

            <v-card-actions class="px-4 pb-4">
              <v-spacer />
              <v-btn variant="outlined" @click="step = 3">Back</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                :disabled="!!stepOneError"
                data-test="create-track-btn"
                @click="submit"
              >
                {{ isEdit ? 'Update' : 'Create' }}
              </v-btn>
            </v-card-actions>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>
    </v-card>
  </v-dialog>
</template>

<script>
import { OpenC3Api } from '@openc3/js-common/services'
import {
  TargetPacketItemChooser,
  OpenC3TimePicker,
} from '@openc3/vue-common/components'
import { TimeFilters } from '@openc3/vue-common/util'

export default {
  components: {
    TargetPacketItemChooser,
    OpenC3TimePicker,
  },
  mixins: [TimeFilters],
  props: {
    modelValue: Boolean,
    tracks: {
      type: Array,
      default: () => [],
    },
    editTrack: {
      type: Object,
      default: null,
    },
  },
  emits: ['update:modelValue', 'create', 'update'],
  data() {
    return {
      step: 1,
      trackName: '',
      selectedTargetName: null,
      selectedPacketName: null,
      selectedLatItem: null,
      selectedLonItem: null,
      itemNames: [],
      color: '#FF0000',
      trailTime: 900,
      // Time range
      startDate: null,
      startTime: null,
      endDate: null,
      endTime: null,
      timeZone: 'local',
      swatches: [
        ['#FF0000', '#AA0000', '#550000'],
        ['#FFFF00', '#AAAA00', '#555500'],
        ['#00FF00', '#00AA00', '#005500'],
        ['#00FFFF', '#00AAAA', '#005555'],
        ['#0000FF', '#0000AA', '#000055'],
      ],
      api: null,
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
      return this.editTrack !== null
    },
    stepOneError() {
      if (!this.trackName) return 'Track name is required'
      if (!this.isEdit && this.tracks.some((t) => t.name === this.trackName)) {
        return 'Track name already exists'
      }
      if (!this.selectedTargetName || !this.selectedPacketName) {
        return 'Select a target and packet'
      }
      if (!this.selectedLatItem) return 'Select a latitude item'
      if (!this.selectedLonItem) return 'Select a longitude item'
      return null
    },
    startEndTime() {
      let startTemp = null
      let endTemp = null

      try {
        if (this.startDate && this.startTime) {
          const startStr = `${this.startDate} ${this.startTime}`
          startTemp = this.parseDateTime(startStr, this.timeZone)
        }

        if (this.endDate && this.endTime) {
          const endStr = `${this.endDate} ${this.endTime}`
          endTemp = this.parseDateTime(endStr, this.timeZone)
        }
      } catch (e) {
        return { start_time: null, end_time: null }
      }

      return {
        start_time: startTemp ? startTemp * 1_000_000 : null,
        end_time: endTemp ? endTemp * 1_000_000 : null,
      }
    },
    trackConfig() {
      return {
        name: this.trackName,
        targetName: this.selectedTargetName,
        packetName: this.selectedPacketName,
        latItem: this.selectedLatItem,
        lonItem: this.selectedLonItem,
        color: this.color,
        trailTime: this.trailTime,
        startDate: this.startDate,
        startTime: this.startTime,
        endDate: this.endDate,
        endTime: this.endTime,
        timeZone: this.timeZone,
        ...this.startEndTime,
      }
    },
    trackConfigDisplay() {
      // Cleaner display for review step
      return {
        name: this.trackName,
        target: this.selectedTargetName,
        packet: this.selectedPacketName,
        latitudeItem: this.selectedLatItem,
        longitudeItem: this.selectedLonItem,
        color: this.color,
        trailTime: `${this.trailTime} seconds`,
        startDateTime:
          this.startDate && this.startTime
            ? `${this.startDate} ${this.startTime}`
            : 'Now',
        endDateTime:
          this.endDate && this.endTime
            ? `${this.endDate} ${this.endTime}`
            : 'Real-time (no end)',
        timeZone: this.timeZone,
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
  async created() {
    this.api = new OpenC3Api()
    // Get timezone setting from server
    try {
      const response = await this.api.get_setting('time_zone')
      if (response) {
        this.timeZone = response
      }
    } catch (e) {
      // Default to local
      this.timeZone = 'local'
    }
    this.initializeForm()
  },
  methods: {
    initializeForm() {
      if (this.editTrack) {
        // Populate form with existing track data
        this.trackName = this.editTrack.name
        this.selectedTargetName = this.editTrack.targetName
        this.selectedPacketName = this.editTrack.packetName
        this.selectedLatItem = this.editTrack.latItem
        this.selectedLonItem = this.editTrack.lonItem
        this.color = this.editTrack.color
        this.trailTime = this.editTrack.trailTime
        this.startDate = this.editTrack.startDate || null
        this.startTime = this.editTrack.startTime || null
        this.endDate = this.editTrack.endDate || null
        this.endTime = this.editTrack.endTime || null
        // Load items for the packet
        this.updateItems()
      } else {
        this.setDefaultTimes()
      }
    },
    setDefaultTimes() {
      // Default to 1 hour ago
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      this.startDate = this.formatDate(oneHourAgo, this.timeZone)
      this.startTime = this.formatTimeHMS(oneHourAgo, this.timeZone)
      this.endDate = null
      this.endTime = null
    },
    targetPacketChanged(event) {
      this.selectedTargetName = event.targetName
      this.selectedPacketName = event.packetName
      this.updateItems()
    },
    async updateItems() {
      if (!this.selectedTargetName || !this.selectedPacketName) return

      try {
        const packet = await this.api.get_telemetry(
          this.selectedTargetName,
          this.selectedPacketName,
        )
        this.itemNames = packet.items.map((item) => item.name)
      } catch (err) {
        console.error('Failed to get telemetry items:', err)
        this.itemNames = []
      }
    },
    cancel() {
      this.reset()
      this.show = false
    },
    submit() {
      if (this.isEdit) {
        this.$emit('update', this.trackConfig)
      } else {
        this.$emit('create', this.trackConfig)
      }
      this.reset()
      this.show = false
    },
    reset() {
      this.step = 1
      this.trackName = ''
      this.selectedTargetName = null
      this.selectedPacketName = null
      this.selectedLatItem = null
      this.selectedLonItem = null
      this.itemNames = []
      this.color = '#FF0000'
      this.trailTime = 900
      this.startDate = null
      this.startTime = null
      this.endDate = null
      this.endTime = null
    },
  },
}
</script>
