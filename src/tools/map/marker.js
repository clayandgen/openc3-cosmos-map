/*
# Copyright 2026 OpenC3, Inc.
# All Rights Reserved.
#
# This file may also be used under the terms of a commercial license
# if purchased from OpenC3, Inc.
*/

import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { Icon, Style, Text, Fill, Stroke } from 'ol/style'

// Available marker icons with MDI names and SVG paths
// Icon IDs must match valid MDI icon names (used as mdi-{id} in the dialog)
export const MARKER_ICONS = [
  {
    id: 'satellite-uplink',
    label: 'Ground Station',
    path: 'M11.86,2L11.34,3.93C15.75,4.78 19.2,8.23 20.05,12.65L22,12.13C20.95,7.03 16.96,3.04 11.86,2M10.82,5.86L10.3,7.81C13.34,8.27 15.72,10.65 16.18,13.68L18.12,13.16C17.46,9.44 14.55,6.5 10.82,5.86M3.72,9.69C3.25,10.73 3,11.86 3,13C3,14.95 3.71,16.82 5,18.28V22H8V20.41C8.95,20.8 9.97,21 11,21C12.14,21 13.27,20.75 14.3,20.28L3.72,9.69M9.79,9.76L9.26,11.72A3,3 0 0,1 12.26,14.72L14.23,14.2C14,11.86 12.13,10 9.79,9.76Z',
  },
  {
    id: 'antenna',
    label: 'Antenna',
    path: 'M12 7.5C12.69 7.5 13.27 7.73 13.76 8.2S14.5 9.27 14.5 10C14.5 11.05 14 11.81 13 12.28V21H11V12.28C10 11.81 9.5 11.05 9.5 10C9.5 9.27 9.76 8.67 10.24 8.2S11.31 7.5 12 7.5M16.69 5.3C17.94 6.55 18.61 8.11 18.7 10C18.7 11.8 18.03 13.38 16.69 14.72L15.5 13.5C16.5 12.59 17 11.42 17 10C17 8.67 16.5 7.5 15.5 6.5L16.69 5.3M6.09 4.08C4.5 5.67 3.7 7.64 3.7 10S4.5 14.3 6.09 15.89L4.92 17.11C3 15.08 2 12.7 2 10C2 7.3 3 4.94 4.92 2.91L6.09 4.08M19.08 2.91C21 4.94 22 7.3 22 10C22 12.8 21 15.17 19.08 17.11L17.91 15.89C19.5 14.3 20.3 12.33 20.3 10S19.5 5.67 17.91 4.08L19.08 2.91M7.31 5.3L8.5 6.5C7.5 7.42 7 8.58 7 10C7 11.33 7.5 12.5 8.5 13.5L7.31 14.72C5.97 13.38 5.3 11.8 5.3 10C5.3 8.2 5.97 6.64 7.31 5.3Z',
  },
  {
    id: 'airplane',
    label: 'Aircraft',
    path: 'M20.56 3.91C21.15 4.5 21.15 5.45 20.56 6.03L16.67 9.92L18.79 19.11L17.38 20.53L13.5 13.1L9.6 17L9.96 19.47L8.89 20.53L7.13 17.35L3.94 15.58L5 14.5L7.5 14.87L11.37 11L3.94 7.09L5.36 5.68L14.55 7.8L18.44 3.91C19 3.33 20 3.33 20.56 3.91Z',
  },
  {
    id: 'satellite-variant',
    label: 'Satellite',
    path: 'M11.62,1L17.28,6.67L15.16,8.79L13.04,6.67L11.62,8.09L13.95,10.41L12.79,11.58L13.24,12.04C14.17,11.61 15.31,11.77 16.07,12.54L12.54,16.07C11.77,15.31 11.61,14.17 12.04,13.24L11.58,12.79L10.41,13.95L8.09,11.62L6.67,13.04L8.79,15.16L6.67,17.28L1,11.62L3.14,9.5L5.26,11.62L6.67,10.21L3.84,7.38C3.06,6.6 3.06,5.33 3.84,4.55L4.55,3.84C5.33,3.06 6.6,3.06 7.38,3.84L10.21,6.67L11.62,5.26L9.5,3.14L11.62,1M18,14A4,4 0 0,1 14,18V16A2,2 0 0,0 16,14H18M22,14A8,8 0 0,1 14,22V20A6,6 0 0,0 20,14H22Z',
  },
  {
    id: 'radio-tower',
    label: 'Tower',
    path: 'M12,10A2,2 0 0,1 14,12C14,12.5 13.82,12.94 13.53,13.29L16.7,22H14.57L12,14.93L9.43,22H7.3L10.47,13.29C10.18,12.94 10,12.5 10,12A2,2 0 0,1 12,10M12,8A4,4 0 0,0 8,12C8,12.5 8.1,13 8.28,13.46L7.4,15.86C6.53,14.81 6,13.47 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12C18,13.47 17.47,14.81 16.6,15.86L15.72,13.46C15.9,13 16,12.5 16,12A4,4 0 0,0 12,8M12,4A8,8 0 0,0 4,12C4,14.36 5,16.5 6.64,17.94L5.92,19.94C3.54,18.11 2,15.23 2,12A10,10 0 0,1 12,2A10,10 0 0,1 22,12C22,15.23 20.46,18.11 18.08,19.94L17.36,17.94C19,16.5 20,14.36 20,12A8,8 0 0,0 12,4Z',
  },
  {
    id: 'ferry',
    label: 'Ship',
    path: 'M6,6H18V9.96L12,8L6,9.96M3.94,19H4C5.6,19 7,18.12 8,17C9,18.12 10.4,19 12,19C13.6,19 15,18.12 16,17C17,18.12 18.4,19 20,19H20.05L21.95,12.31C22.03,12.06 22,11.78 21.89,11.54C21.76,11.3 21.55,11.12 21.29,11.04L20,10.62V6C20,4.89 19.1,4 18,4H15V1H9V4H6A2,2 0 0,0 4,6V10.62L2.71,11.04C2.45,11.12 2.24,11.3 2.11,11.54C2,11.78 1.97,12.06 2.05,12.31M20,21C18.61,21 17.22,20.53 16,19.67C13.56,21.38 10.44,21.38 8,19.67C6.78,20.53 5.39,21 4,21H2V23H4C5.37,23 6.74,22.65 8,22C10.5,23.3 13.5,23.3 16,22C17.26,22.65 18.62,23 20,23H22V21H20Z',
  },
  {
    id: 'car',
    label: 'Vehicle',
    path: 'M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z',
  },
  {
    id: 'map-marker',
    label: 'Pin',
    path: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z',
  },
  {
    id: 'flag',
    label: 'Flag',
    path: 'M14.4 6L14 4H5V21H7V14H12.6L13 16H20V6H14.4Z',
  },
  {
    id: 'star',
    label: 'Star',
    path: 'M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.62L12 2L9.19 8.62L2 9.24L7.45 13.97L5.82 21L12 17.27Z',
  },
  {
    id: 'quadcopter',
    label: 'Quadcopter',
    path: 'M5.5,1C8,1 10,3 10,5.5C10,6.38 9.75,7.2 9.31,7.9L9.41,8H14.59L14.69,7.9C14.25,7.2 14,6.38 14,5.5C14,3 16,1 18.5,1C21,1 23,3 23,5.5C23,8 21,10 18.5,10C17.62,10 16.8,9.75 16.1,9.31L15,10.41V13.59L16.1,14.69C16.8,14.25 17.62,14 18.5,14C21,14 23,16 23,18.5C23,21 21,23 18.5,23C16,23 14,21 14,18.5C14,17.62 14.25,16.8 14.69,16.1L14.59,16H9.41L9.31,16.1C9.75,16.8 10,17.62 10,18.5C10,21 8,23 5.5,23C3,23 1,21 1,18.5C1,16 3,14 5.5,14C6.38,14 7.2,14.25 7.9,14.69L9,13.59V10.41L7.9,9.31C7.2,9.75 6.38,10 5.5,10C3,10 1,8 1,5.5C1,3 3,1 5.5,1M5.5,3A2.5,2.5 0 0,0 3,5.5A2.5,2.5 0 0,0 5.5,8A2.5,2.5 0 0,0 8,5.5A2.5,2.5 0 0,0 5.5,3M5.5,16A2.5,2.5 0 0,0 3,18.5A2.5,2.5 0 0,0 5.5,21A2.5,2.5 0 0,0 8,18.5A2.5,2.5 0 0,0 5.5,16M18.5,3A2.5,2.5 0 0,0 16,5.5A2.5,2.5 0 0,0 18.5,8A2.5,2.5 0 0,0 21,5.5A2.5,2.5 0 0,0 18.5,3M18.5,16A2.5,2.5 0 0,0 16,18.5A2.5,2.5 0 0,0 18.5,21A2.5,2.5 0 0,0 21,18.5A2.5,2.5 0 0,0 18.5,16M3.91,17.25L5.04,17.91C5.17,17.81 5.33,17.75 5.5,17.75A0.75,0.75 0 0,1 6.25,18.5L6.24,18.6L7.37,19.25L7.09,19.75L5.96,19.09C5.83,19.19 5.67,19.25 5.5,19.25A0.75,0.75 0 0,1 4.75,18.5L4.76,18.4L3.63,17.75L3.91,17.25M3.63,6.25L4.76,5.6L4.75,5.5A0.75,0.75 0 0,1 5.5,4.75C5.67,4.75 5.83,4.81 5.96,4.91L7.09,4.25L7.37,4.75L6.24,5.4L6.25,5.5A0.75,0.75 0 0,1 5.5,6.25C5.33,6.25 5.17,6.19 5.04,6.09L3.91,6.75L3.63,6.25M16.91,4.25L18.04,4.91C18.17,4.81 18.33,4.75 18.5,4.75A0.75,0.75 0 0,1 19.25,5.5L19.24,5.6L20.37,6.25L20.09,6.75L18.96,6.09C18.83,6.19 18.67,6.25 18.5,6.25A0.75,0.75 0 0,1 17.75,5.5L17.76,5.4L16.63,4.75L16.91,4.25M16.63,19.25L17.75,18.5A0.75,0.75 0 0,1 18.5,17.75C18.67,17.75 18.83,17.81 18.96,17.91L20.09,17.25L20.37,17.75L19.25,18.5A0.75,0.75 0 0,1 18.5,19.25C18.33,19.25 18.17,19.19 18.04,19.09L16.91,19.75L16.63,19.25Z',
  },
  {
    id: 'helicopter',
    label: 'Helicopter',
    path: 'M3,3H17V5H3V3M23,6V10.5L14.75,12.2C14.91,12.6 15,13.04 15,13.5C15,14.9 14.18,16.1 13,16.66V17L13,19H16V21H4A3,3 0 0,1 1,18V17H3V18A1,1 0 0,0 4,19H5V16.74C3.25,16.13 2,14.46 2,12.5C2,10 4,8 6.5,8H9V6H11V8H21V6H23M11,19V17H7V19H11M7.5,10C6.12,10 5,10.9 5,12C5,13.1 6.12,14 7.5,14C8.88,14 10,13.1 10,12C10,10.9 8.88,10 7.5,10Z',
  },
]

/**
 * Creates an SVG data URL for a marker icon
 * @param {string} iconId - The icon ID from MARKER_ICONS
 * @param {string} color - CSS color string
 * @returns {string} Data URL for the SVG icon
 */
function createIconSvg(iconId, color) {
  const icon = MARKER_ICONS.find((i) => i.id === iconId)
  if (!icon) return null

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path d="${icon.path}" fill="${color}" stroke="#000000" stroke-width="0.5"/>
    </svg>
  `
  return 'data:image/svg+xml,' + encodeURIComponent(svg.trim())
}

/**
 * Creates a marker layer for a static position
 * @param {object} config - Marker configuration
 * @param {string} config.name - Marker name
 * @param {number} config.lat - Latitude in degrees
 * @param {number} config.lon - Longitude in degrees
 * @param {string} config.icon - Icon ID
 * @param {string} config.color - CSS color string
 * @param {boolean} config.showLabel - Whether to show the label
 * @returns {{layer: VectorLayer, source: VectorSource}}
 */
export function createMarkerLayer(config) {
  const { name, lat, lon, icon, color, showLabel = true } = config

  const source = new VectorSource()

  const iconSrc = createIconSvg(icon, color)

  const style = new Style({
    image: new Icon({
      src: iconSrc,
      scale: 1,
      anchor: [0.5, 0.5],
    }),
    text: showLabel
      ? new Text({
          text: name,
          offsetY: 24,
          font: 'bold 12px sans-serif',
          fill: new Fill({ color: '#ffffff' }),
          stroke: new Stroke({ color: '#000000', width: 4 }),
        })
      : undefined,
  })

  const layer = new VectorLayer({
    source,
    style,
  })

  const feature = new Feature({
    geometry: new Point([lon, lat]),
    name,
  })
  feature.setId(name)
  source.addFeature(feature)

  return { layer, source }
}

/**
 * Updates a marker's position
 * @param {VectorSource} source - The marker's vector source
 * @param {number} lon - New longitude
 * @param {number} lat - New latitude
 */
export function updateMarkerPosition(source, lon, lat) {
  const features = source.getFeatures()
  if (features.length > 0) {
    features[0].getGeometry().setCoordinates([lon, lat])
  }
}
