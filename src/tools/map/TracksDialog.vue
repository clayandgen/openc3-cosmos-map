<!--
# Copyright 2026 Clay Kramp
# All Rights Reserved.
-->

<template>
  <v-dialog v-model="show" max-width="500">
    <v-card>
      <v-toolbar height="48">
        <v-spacer />
        <span class="text-h6">Tracks</span>
        <v-spacer />
        <v-btn icon @click="show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-list v-if="tracks.length > 0">
          <v-list-item
            v-for="track in tracks"
            :key="track.name"
            :title="track.name"
            :subtitle="formatSubtitle(track)"
          >
            <template #prepend>
              <v-icon :color="track.color">mdi-map-marker-path</v-icon>
            </template>
            <template #append>
              <v-btn
                icon
                size="small"
                variant="text"
                @click="$emit('edit', track)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                icon
                size="small"
                variant="text"
                @click="$emit('delete', track)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>

        <div v-else class="text-center pa-4 text-medium-emphasis">
          No tracks configured. <br>
          Use Map &rarr; Add Track to create one.
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
    tracks: {
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
    formatSubtitle(track) {
      let subtitle = `${track.targetName} / ${track.packetName}`
      if (track.startDate && track.startTime) {
        subtitle += ` | ${track.startDate} ${track.startTime}`
        if (track.endDate && track.endTime) {
          subtitle += ` - ${track.endDate} ${track.endTime}`
        } else {
          subtitle += ' - now'
        }
      }
      return subtitle
    },
  },
}
</script>
