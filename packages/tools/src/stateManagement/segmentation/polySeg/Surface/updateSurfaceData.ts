import type { Types } from '@cornerstonejs/core';
import { cache } from '@cornerstonejs/core';
import { getUniqueSegmentIndices } from '../../../../utilities/segmentation';
import {
  getSegmentation,
  getAllSegmentationRepresentations,
  getSegmentationRepresentations,
  getViewportIdsWithSegmentation,
} from '../../segmentationState';
import { triggerSegmentationModified } from '../../triggerSegmentationEvents';
import { SegmentationRepresentations } from '../../../../enums';
import { computeSurfaceFromLabelmapSegmentation } from './surfaceComputationStrategies';
import { createAndCacheSurfacesFromRaw } from './createAndCacheSurfacesFromRaw';
import { viewport } from '../../../../utilities';

export async function updateSurfaceData(segmentationId) {
  const surfacesObj = await computeSurfaceFromLabelmapSegmentation(
    segmentationId
  );

  if (!surfacesObj) {
    return;
  }

  const segmentation = getSegmentation(segmentationId);
  const indices = getUniqueSegmentIndices(segmentationId);

  if (!indices.length) {
    // means all segments were removed so we need to empty out
    // the geometry data
    const geometryIds = segmentation.representationData.SURFACE.geometryIds;
    geometryIds.forEach((geometryId) => {
      const geometry = cache.getGeometry(geometryId);
      const surface = geometry.data as Types.ISurface;
      surface.setPoints([]);
      surface.setPolys([]);
    });

    triggerSegmentationModified(segmentationId);

    return;
  }

  const promises = surfacesObj.map(({ data, segmentIndex }) => {
    const geometryId = `segmentation_${segmentationId}_surface_${segmentIndex}`;

    const geometry = cache.getGeometry(geometryId);

    if (!geometry) {
      // means it is a new segment getting added while we were
      // listening to the segmentation data modified event
      const viewportIds = getViewportIdsWithSegmentation(segmentationId);

      return viewportIds.map((viewportId) => {
        const segmentationRepresentations =
          getSegmentationRepresentations(viewportId);

        return segmentationRepresentations.map((segmentationRepresentation) => {
          if (
            segmentationRepresentation.type !==
            SegmentationRepresentations.Surface
          ) {
            return;
          }
          segmentation.representationData.SURFACE.geometryIds.set(
            segmentIndex,
            geometryId
          );

          return createAndCacheSurfacesFromRaw(
            segmentationId,
            [{ segmentIndex, data }],
            {
              segmentationRepresentationUID:
                segmentationRepresentation.segmentationRepresentationUID,
            }
          );
        });
      });
    } else if (indices.includes(segmentIndex)) {
      // if the geometry already exists and the segmentIndex is
      // still present, update the geometry data
      const surface = geometry.data as Types.ISurface;
      surface.setPoints(data.points);
      surface.setPolys(data.polys);
    } else {
      const surface = geometry.data as Types.ISurface;
      surface.setPoints([]);
      surface.setPolys([]);
    }
  });

  await Promise.all(promises);

  triggerSegmentationModified(segmentationId);
}
