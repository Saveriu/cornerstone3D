import calculateTransform from './calculateTransform.js';
import {
  CPUFallbackEnabledElement,
  CPUFallbackTransform,
} from '../../../../types/index.js';

export default function (
  enabledElement: CPUFallbackEnabledElement
): CPUFallbackTransform {
  // Todo: for some reason using the cached transfer after the first call
  // does not give correct transform.
  // if (enabledElement.transform) {
  //   return enabledElement.transform;
  // }

  return calculateTransform(enabledElement);
}
