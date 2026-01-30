/*
# Copyright 2026 OpenC3, Inc.
# All Rights Reserved.
#
# This file may also be used under the terms of a commercial license
# if purchased from OpenC3, Inc.
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
