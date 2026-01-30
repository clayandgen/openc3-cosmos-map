/*
# Copyright 2026 OpenC3, Inc.
# All Rights Reserved.
#
# This file may also be used under the terms of a commercial license
# if purchased from OpenC3, Inc.
*/

import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS'
import WMTSCapabilities from 'ol/format/WMTSCapabilities'
import Projection from 'ol/proj/Projection'
import { get as getProjection, addProjection } from 'ol/proj'

/**
 * Fetch and parse WMTS capabilities from a URL
 * @param {string} url - The WMTS GetCapabilities URL
 * @returns {Promise<{capabilities: object, layers: Array}>}
 */
export async function fetchWmtsCapabilities(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const text = await response.text()
  const parser = new WMTSCapabilities()
  const capabilities = parser.read(text)

  if (!capabilities?.Contents?.Layer) {
    throw new Error('Invalid WMTS capabilities response')
  }

  const layers = capabilities.Contents.Layer.map((layer) => ({
    identifier: layer.Identifier,
    title: layer.Title || layer.Identifier,
  }))

  return { capabilities, layers }
}

/**
 * Get available tile matrix sets for a layer
 * @param {object} capabilities - Parsed WMTS capabilities
 * @param {string} layerIdentifier - The layer identifier
 * @returns {Array<string>}
 */
export function getLayerMatrixSets(capabilities, layerIdentifier) {
  if (!capabilities?.Contents?.Layer) return []
  const layer = capabilities.Contents.Layer.find(
    (l) => l.Identifier === layerIdentifier,
  )
  if (!layer) return []
  return layer.TileMatrixSetLink.map((link) => link.TileMatrixSet)
}

/**
 * Register projections from WMTS capabilities that OpenLayers doesn't know about
 * @param {object} capabilities - Parsed WMTS capabilities
 */
export function registerProjectionsFromCapabilities(capabilities) {
  if (!capabilities?.Contents?.TileMatrixSet) return

  capabilities.Contents.TileMatrixSet.forEach((tms) => {
    const crs = tms.SupportedCRS
    if (!crs || getProjection(crs)) return

    const proj = new Projection({
      code: crs,
      units: 'degrees',
      extent: [-180, -90, 180, 90],
      worldExtent: [-180, -90, 180, 90],
      axisOrientation: 'enu',
      global: true,
    })
    addProjection(proj)
  })
}

/**
 * Create a WMTS tile source from capabilities
 * @param {object} capabilities - Parsed WMTS capabilities
 * @param {string} layer - Layer identifier
 * @param {string} [matrixSet] - Optional tile matrix set
 * @returns {WMTS}
 */
export function createWmtsSource(capabilities, layer, matrixSet) {
  registerProjectionsFromCapabilities(capabilities)

  const options = optionsFromCapabilities(capabilities, {
    layer,
    matrixSet: matrixSet || undefined,
  })

  if (!options) {
    throw new Error(`Could not create WMTS options for layer: ${layer}`)
  }

  const wmtsSource = new WMTS(options)

  // Fix double slashes in generated tile URLs
  const originalTileUrlFunction = wmtsSource.getTileUrlFunction()
  wmtsSource.setTileUrlFunction((tileCoord, pixelRatio, projection) => {
    let url = originalTileUrlFunction(tileCoord, pixelRatio, projection)
    if (url) {
      url = url.replace(/([^:]\/)\/+/g, '$1')
    }
    return url
  })

  return wmtsSource
}
