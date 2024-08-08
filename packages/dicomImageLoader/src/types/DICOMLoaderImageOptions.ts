import { Types } from '@cornerstonejs/core';
import { LoadRequestFunction } from './LoadRequestFunction';
import { StreamingData } from '../imageLoader/wadors/loadImage';

export interface DICOMLoaderImageOptions {
  useRGBA?: boolean;
  allowFloatRendering?: boolean;
  skipCreateImage?: boolean;
  preScale?: {
    enabled: boolean;
    scalingParameters?: Types.ScalingParameters;
  };
  targetBuffer?: {
    type: Types.PixelDataTypedArrayString;
    arrayBuffer: ArrayBufferLike;
    length: number;
    offset: number;
    rows?: number;
    columns?: number;
  };
  loader?: LoadRequestFunction;
  decodeLevel?: number;
  retrieveOptions?: Types.RetrieveOptions;
  streamingData?: StreamingData;
}
