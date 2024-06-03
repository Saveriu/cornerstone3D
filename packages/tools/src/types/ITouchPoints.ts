import IPoints from './IPoints.js';

type ITouchPoints = IPoints & {
  /** Native Touch object properties which are JSON serializable*/
  touch: {
    identifier: string;
    radiusX: number;
    radiusY: number;
    force: number;
    rotationAngle: number;
  };
};

export default ITouchPoints;
