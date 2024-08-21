import { utilities } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { triggerSegmentationRepresentationModified } from '../triggerSegmentationEvents';
import { addColorLUT as _addColorLUT } from '../addColorLUT';
import { getColorLUT as _getColorLUT } from '../getColorLUT';
import { getSegmentationRepresentation } from '../getSegmentationRepresentation';

/**
 * addColorLUT - Adds a new color LUT to the state at the given colorLUTIndex.
 * If no colorLUT is provided, a new color LUT is generated.
 *
 * @param colorLUT - An array of The colorLUT to set.
 * @param colorLUTIndex - the index of the colorLUT in the state
 * @returns
 */
function addColorLUT(colorLUT: Types.ColorLUT, colorLUTIndex: number): void {
  if (!colorLUT) {
    throw new Error('addColorLUT: colorLUT is required');
  }

  // Append the "zero" (no label) color to the front of the LUT, if necessary.
  if (!utilities.isEqual(colorLUT[0], [0, 0, 0, 0])) {
    console.warn(
      'addColorLUT: [0, 0, 0, 0] color is not provided for the background color (segmentIndex =0), automatically adding it'
    );
    colorLUT.unshift([0, 0, 0, 0]);
  }

  _addColorLUT(colorLUT, colorLUTIndex);
}

/**
 * It sets the segmentationRepresentation to use the provided
 * colorLUT at the given colorLUTIndex.
 * @param segmentationRepresentationUID - the representationUID for the segmentation
 * @param colorLUTIndex - the index of the colorLUT to use
 */
function setColorLUT(
  segmentationRepresentationUID: string,
  colorLUTIndex: number
): void {
  const segRepresentation = getSegmentationRepresentation(
    segmentationRepresentationUID
  );

  if (!segRepresentation) {
    throw new Error(
      `setColorLUT: could not find segmentation representation with UID ${segmentationRepresentationUID}`
    );
  }

  if (!_getColorLUT(colorLUTIndex)) {
    throw new Error(
      `setColorLUT: could not find colorLUT with index ${colorLUTIndex}`
    );
  }

  segRepresentation.colorLUTIndex = colorLUTIndex;

  triggerSegmentationRepresentationModified(segmentationRepresentationUID);
}

/**
 * Given a segmentation representationUID and a segment index, return the
 * color for that segment. It can be used for segmentation tools that need to
 * display the color of their annotation.
 *
 * @param segmentationRepresentationUID - The uid of the segmentation representation
 * @param segmentIndex - The index of the segment in the segmentation
 * @returns A color.
 */
function getSegmentIndexColor(
  segmentationRepresentationUID: string,
  segmentIndex: number
): Types.Color {
  const segmentationRepresentation = getSegmentationRepresentation(
    segmentationRepresentationUID
  );

  if (!segmentationRepresentation) {
    throw new Error(
      `segmentation representation with UID ${segmentationRepresentationUID} does not exist`
    );
  }

  const { colorLUTIndex } = segmentationRepresentation;

  // get colorLUT
  const colorLUT = _getColorLUT(colorLUTIndex);
  let colorValue = colorLUT[segmentIndex];
  if (!colorValue) {
    if (typeof segmentIndex !== 'number') {
      throw new Error(`Can't create colour for LUT index ${segmentIndex}`);
    }
    colorValue = colorLUT[segmentIndex] = [0, 0, 0, 0];
  }
  return colorValue;
}

function setSegmentIndexColor(
  segmentationRepresentationUID: string,
  segmentIndex: number,
  color: Types.Color
): void {
  // Get the reference to the color in the colorLUT.
  const colorReference = getSegmentIndexColor(
    segmentationRepresentationUID,
    segmentIndex
  );

  // Modify the values by reference
  for (let i = 0; i < color.length; i++) {
    colorReference[i] = color[i];
  }

  triggerSegmentationRepresentationModified(segmentationRepresentationUID);
}

export { getSegmentIndexColor, addColorLUT, setColorLUT, setSegmentIndexColor };
