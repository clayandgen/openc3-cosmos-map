/*
# Copyright 2026 Clay Kramp
# All Rights Reserved.
*/

import XYZ from 'ol/source/XYZ'

/**
 * Create a TMS/XYZ tile source from a URL template
 * @param {string} url - The tile URL template with {z}, {x}, {y} placeholders
 * @returns {XYZ}
 */
export function createTmsSource(url) {
  return new XYZ({
    url
  })
}
