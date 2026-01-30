<!--
# Copyright 2026 OpenC3, Inc.
# All Rights Reserved.
#
# This file may also be used under the terms of a commercial license
# if purchased from OpenC3, Inc.
-->

<template>
  <v-dialog v-model="show" max-width="500">
    <v-card>
      <v-toolbar height="48">
        <v-spacer />
        <span class="text-h6">Markers</span>
        <v-spacer />
        <v-btn icon @click="show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-list v-if="markers.length > 0">
          <v-list-item
            v-for="marker in markers"
            :key="marker.name"
            :title="marker.name"
            :subtitle="formatSubtitle(marker)"
          >
            <template #prepend>
              <v-icon :color="marker.color">mdi-{{ marker.icon }}</v-icon>
            </template>
            <template #append>
              <v-btn
                icon
                size="small"
                variant="text"
                @click="$emit('edit', marker)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                icon
                size="small"
                variant="text"
                @click="$emit('delete', marker)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>

        <div v-else class="text-center pa-4 text-medium-emphasis">
          No markers configured. <br />
          Use Map &rarr; Add Marker to create one.
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="outlined" @click="show = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    modelValue: Boolean,
    markers: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue', 'delete', 'edit'],
  computed: {
    show: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      },
    },
  },
  methods: {
    formatSubtitle(marker) {
      return `${marker.lat.toFixed(4)}, ${marker.lon.toFixed(4)}`
    },
  },
}
</script>
