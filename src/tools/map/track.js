/*
# Copyright 2026 Clay Kramp
# All Rights Reserved.
*/

import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import MultiPoint from 'ol/geom/MultiPoint'
import MultiLineString from 'ol/geom/MultiLineString'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'

// Threshold for detecting antimeridian crossing (degrees)
const ANTIMERIDIAN_THRESHOLD = 180

/**
 * Splits coordinates into segments at antimeridian crossings
 * @param {Array} coords - Array of [lon, lat] coordinates
 * @returns {Array} Array of coordinate arrays (segments)
 */
function splitAtAntimeridian(coords) {
  if (coords.length < 2) {
    return coords.length === 1 ? [coords] : []
  }

  const segments = []
  let currentSegment = [coords[0]]

  for (let i = 1; i < coords.length; i++) {
    const prevLon = coords[i - 1][0]
    const currLon = coords[i][0]
    const lonDiff = Math.abs(currLon - prevLon)

    // If longitude difference exceeds threshold, we crossed the antimeridian
    if (lonDiff > ANTIMERIDIAN_THRESHOLD) {
      // End current segment and start a new one
      if (currentSegment.length > 0) {
        segments.push(currentSegment)
      }
      currentSegment = [coords[i]]
    } else {
      currentSegment.push(coords[i])
    }
  }

  // Add the last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

/**
 * Creates a track layer for displaying position and trail
 * @param {string} color - CSS color string
 * @param {number} trailTime - Seconds of trail to show
 * @returns {{layer: VectorLayer, source: VectorSource, positions: Array}}
 */
export function createTrackLayer(color, trailTime = 900) {
  const source = new VectorSource()

  // Style for the current position point
  const pointStyle = new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  })

  // Style for the trail line - use multiple styles for better visibility
  const lineStyle = [
    // Outer stroke (darker, for contrast)
    new Style({
      stroke: new Stroke({
        color: '#000000',
        width: 5,
      }),
    }),
    // Inner stroke (track color)
    new Style({
      stroke: new Stroke({
        color,
        width: 3,
      }),
    }),
  ]

  // Style for waypoints (small dots at each position)
  const waypointStyle = new Style({
    image: new CircleStyle({
      radius: 4,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#000000', width: 1 }),
    }),
  })

  const layer = new VectorLayer({
    source,
    style: (feature) => {
      const geomType = feature.getGeometry().getType()
      if (geomType === 'Point') {
        return pointStyle
      }
      if (geomType === 'MultiPoint') {
        return waypointStyle
      }
      return lineStyle
    },
  })

  // Create the point and line features
  const pointFeature = new Feature({
    geometry: new Point([0, 0]),
  })
  pointFeature.setId('position')

  const lineFeature = new Feature({
    geometry: new MultiLineString([]),
  })
  lineFeature.setId('trail')

  const waypointsFeature = new Feature({
    geometry: new MultiPoint([]),
  })
  waypointsFeature.setId('waypoints')

  source.addFeature(lineFeature)
  source.addFeature(waypointsFeature)
  source.addFeature(pointFeature) // Add last so it renders on top

  return {
    layer,
    source,
    positions: [],
    trailTime,
    color,
  }
}

/**
 * Updates a track with a new position
 * @param {object} track - Track object from createTrackLayer
 * @param {number} lon - Longitude in degrees
 * @param {number} lat - Latitude in degrees
 * @param {number} timestamp - Timestamp in nanoseconds (OpenC3 format)
 */
export function updateTrackPosition(track, lon, lat, timestamp) {
  const { source, positions, trailTime } = track
  const time = timestamp / 1_000_000 // Convert to milliseconds

  // Add new position
  positions.push({ lon, lat, time })

  // Remove old positions outside trail time window
  const cutoffTime = time - trailTime * 1000
  while (positions.length > 0 && positions[0].time < cutoffTime) {
    positions.shift()
  }

  // Update point feature with current position data
  const pointFeature = source.getFeatureById('position')
  if (pointFeature) {
    pointFeature.getGeometry().setCoordinates([lon, lat])
    pointFeature.set('positionData', { lon, lat, time })
  }

  // Update trail line and waypoints
  const coords = positions.map((p) => [p.lon, p.lat])

  // Split line at antimeridian crossings to prevent long lines across the map
  const lineFeature = source.getFeatureById('trail')
  if (lineFeature) {
    const segments = splitAtAntimeridian(coords)
    lineFeature.getGeometry().setCoordinates(segments)
  }

  // Update waypoints and store positions reference for tooltip lookup
  const waypointsFeature = source.getFeatureById('waypoints')
  if (waypointsFeature) {
    waypointsFeature.getGeometry().setCoordinates(coords)
    waypointsFeature.set('positions', positions)
  }
}

/**
 * Clears all positions from a track
 * @param {object} track - Track object from createTrackLayer
 */
export function clearTrack(track) {
  track.positions.length = 0
  const lineFeature = track.source.getFeatureById('trail')
  if (lineFeature) {
    lineFeature.getGeometry().setCoordinates([]) // Empty MultiLineString
  }
  const waypointsFeature = track.source.getFeatureById('waypoints')
  if (waypointsFeature) {
    waypointsFeature.getGeometry().setCoordinates([])
  }
}

/**
 * Builds the telemetry item key for subscription
 * @param {string} targetName - Target name
 * @param {string} packetName - Packet name
 * @param {string} itemName - Item name
 * @returns {string}
 */
export function buildTelemetryKey(targetName, packetName, itemName) {
  return `DECOM__TLM__${targetName}__${packetName}__${itemName}__CONVERTED`
}
