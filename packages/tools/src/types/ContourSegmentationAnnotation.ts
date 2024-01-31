import type { Types } from '@cornerstonejs/core';
import { ContourAnnotation } from './ContourAnnotation';
// Import the type so it isn't recursive imports
import type { PointsArray } from '../utilities/contours/PointsArray';

export type ContourSegmentationAnnotationData = {
  autoGenerated?: boolean;
  data: {
    segmentation: {
      segmentationId: string;
      segmentIndex: number;
      segmentationRepresentationUID: string;
    };
    contour: {
      /** The original polyline before livewire, to show comparison with
       * regenerated data (eg based on spline or livewire changes).
       */
      originalPolyline?: Types.Point3[];
    };
  };
  handles: {
    /**
     * Segmentation contours can be interpolated between slices to produce
     * intermediate data.  The interpolation sources are the contour data
     * interpolated to generate the final contour.
     *
     * These are sometimes required for things like livewire which need to
     * update the handle position with a snap to nearest live point.
     */
    interpolationSources?: PointsArray<Types.Point3>[];
  };

  /**
   * This is called when interpolation is performed, and can be used to add
   * data specific settings to the annotation instance.
   */
  onInterpolationComplete?: (
    annotation: ContourSegmentationAnnotation
  ) => unknown;
};

export type ContourSegmentationAnnotation = ContourAnnotation &
  ContourSegmentationAnnotationData;
