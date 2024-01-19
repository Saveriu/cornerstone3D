import * as cornerstone3D from '@cornerstonejs/core';
import {
  utilities as toolsUtilities,
  segmentation,
} from '@cornerstonejs/tools';
import * as csTools3d from '../src/index';
import * as testUtils from '../../../utils/test/testUtils';
import EventTypes from '../src/enums/Events';

const {
  cache,
  RenderingEngine,
  Enums,
  utilities,
  imageLoader,
  metaData,
  eventTarget,
  volumeLoader,
  getEnabledElement,
  triggerEvent,
} = cornerstone3D;

const {
  PlanarFreehandContourSegmentationTool,
  SegmentationDisplayTool,
  ToolGroupManager,
  annotation,
  Enums: csToolsEnums,
} = csTools3d;

const { Events, ViewportType } = Enums;
const { Events: csToolsEvents } = csToolsEnums;
const { scroll } = toolsUtilities;
const { isEqual } = utilities;

const segmentationId = `SEGMENTATION_ID`;

const {
  fakeImageLoader,
  fakeVolumeLoader,
  fakeMetaDataProvider,
  createNormalizedMouseEvent,
} = testUtils;

const renderingEngineId = utilities.uuidv4();

const viewportId = 'VIEWPORT';
const toolGroupId = 'toolGroup';
let segmentationRepresentationUID = '';
const interpolationToolName = 'FreeformInterpolation';

const interpolated1 = [
  [9, 9, 1],
  [9, 51, 1],
  [51, 51, 1],
  [51, 9, 1],
  [9, 9, 1],
];

const interpolated2 = [
  [8, 8, 2],
  [8, 52, 2],
  [52, 52, 2],
  [52, 8, 2],
  [8, 8, 2],
];

const interpolated3 = [
  [7, 7, 3],
  [7, 53, 3],
  [53, 53, 3],
  [53, 7, 3],
  [7, 7, 3],
];

// first slice points
const firstSlicePoints = [
  [10, 10, 0],
  [10, 50, 0],
  [50, 50, 0],
  [50, 10, 0],
  [10, 10, 0],
];

// last slice points
const lastSlicePoints = [
  [6, 6, 4],
  [6, 54, 4],
  [54, 54, 4],
  [54, 6, 4],
  [6, 6, 4],
];
const expectedContourSet = [
  firstSlicePoints,
  interpolated1,
  interpolated2,
  interpolated3,
  lastSlicePoints,
];

// Contour Edit Case

const secondSlicePoints = [
  [8, 8, 1],
  [8, 52, 1],
  [52, 52, 1],
  [52, 8, 1],
  [8, 8, 1],
];
const thirdSlicePoints = [];
const fourthSlicePoints = [];
const lastSliceEditCasePoints = [];

secondSlicePoints.forEach((x) => {
  fourthSlicePoints.push([x[0], x[1], 3]);
});
lastSlicePoints.forEach((x) => {
  thirdSlicePoints.push([x[0], x[1], 2]);
});
firstSlicePoints.forEach((x) => {
  lastSliceEditCasePoints.push([x[0], x[1], 4]);
});

const expectedContourEditSet = [
  firstSlicePoints,
  secondSlicePoints,
  thirdSlicePoints,
  fourthSlicePoints,
  lastSliceEditCasePoints,
];
let isContourEdited = false;

// The data.segmentation object, to allow for updates
const dataSegmentation = {
  segmentationId,
  segmentIndex: 1,
};

const firstSliceAnnotation = {
  highlighted: true,
  invalidated: true,
  metadata: {
    viewPlaneNormal: [0, 0, -1],
    viewUp: [0, -1, 0],
    FrameOfReferenceUID: undefined,
    referencedImageId: '',
    toolName: interpolationToolName,
  },
  data: {
    handles: {
      points: [], // Handle points for open contours
      activeHandleIndex: null,
      textBox: {
        hasMoved: false,
        worldPosition: [0, 0, 0],
        worldBoundingBox: {
          topLeft: [0, 0, 0],
          topRight: [0, 0, 0],
          bottomLeft: [0, 0, 0],
          bottomRight: [0, 0, 0],
        },
      },
    },
    contour: {
      polyline: [], // Polyline coordinates
      closed: true,
    },
    segmentation: dataSegmentation,
    label: 'label1',
    cachedStats: {},
  },
  interpolationUID: utilities.uuidv4(),
  autoGenerated: false,
};

const lastSliceAnnotation = structuredClone(firstSliceAnnotation);

function createViewport(renderingEngine, viewportType, width, height) {
  const element = document.createElement('div');

  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  document.body.appendChild(element);

  renderingEngine.setViewports([
    {
      viewportId: viewportId,
      type: viewportType,
      element,
      defaultOptions: {
        background: [1, 0, 1], // pinkish background
        orientation: Enums.OrientationAxis.AXIAL,
      },
    },
  ]);
  return element;
}

const volumeId = `fakeVolumeLoader:volumeURI_100_100_4_1_1_1_0`;

describe('Contours Interpolation: ', () => {
  beforeAll(() => {
    cornerstone3D.setUseCPURendering(false);
  });

  describe('Planar Freeform Tool: ', () => {
    beforeEach(async function () {
      csTools3d.init();
      csTools3d.addTool(PlanarFreehandContourSegmentationTool);
      csTools3d.addTool(SegmentationDisplayTool);
      cache.purgeCache();
      this.DOMElements = [];

      this.stackToolGroup = ToolGroupManager.createToolGroup(toolGroupId);
      this.stackToolGroup.addTool(
        PlanarFreehandContourSegmentationTool.toolName
      );
      this.stackToolGroup.addToolInstance(
        interpolationToolName,
        PlanarFreehandContourSegmentationTool.toolName,
        {
          interpolation: { enabled: true },
          volumeId: volumeId,
          calculateStats: true,
        }
      );
      this.stackToolGroup.setToolActive(interpolationToolName, {
        bindings: [{ mouseButton: 1 }],
        calculateStats: true,
      });
      this.stackToolGroup.addTool(csTools3d.SegmentationDisplayTool.toolName);

      this.renderingEngine = new RenderingEngine(renderingEngineId);
      imageLoader.registerImageLoader('fakeImageLoader', fakeImageLoader);
      volumeLoader.registerVolumeLoader('fakeVolumeLoader', fakeVolumeLoader);
      metaData.addProvider(fakeMetaDataProvider, 10000);
      // Add a segmentation that will contains the contour annotations
      segmentation.addSegmentations([
        {
          segmentationId,
          representation: {
            type: csToolsEnums.SegmentationRepresentations.Contour,
          },
        },
      ]);
      [segmentationRepresentationUID] =
        await segmentation.addSegmentationRepresentations(toolGroupId, [
          {
            segmentationId,
            type: csToolsEnums.SegmentationRepresentations.Contour,
          },
        ]);
      dataSegmentation.segmentationRepresentationUID =
        segmentationRepresentationUID;
    });

    afterEach(function () {
      this.renderingEngine.disableElement(viewportId);
      csTools3d.destroy();
      eventTarget.reset();
      cache.purgeCache();
      this.renderingEngine.destroy();
      metaData.removeProvider(fakeMetaDataProvider);
      imageLoader.unregisterAllImageLoaders();
      ToolGroupManager.destroyToolGroup(toolGroupId);
      try {
        this.DOMElements.forEach((el) => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      } catch (e) {
        console.warn('Unable to remove child', e);
      }
    });

    it('Should successfully create a interpolated annotations on slices', function (done) {
      const element = createViewport(
        this.renderingEngine,
        ViewportType.STACK,
        512,
        128
      );
      this.DOMElements.push(element);

      const imageIds = [
        'fakeImageLoader:imageURI_64_64_10_5_1_1_0',
        'fakeImageLoader:imageURI_64_64_0_20_1_1_0',
        'fakeImageLoader:imageURI_64_64_10_5_3_2_0',
        'fakeImageLoader:imageURI_64_64_15_5_3_2_0',
      ];
      const vp = this.renderingEngine.getViewport(viewportId);
      let expectedContourCount = 0;

      function drawAnnotation(slicePoints) {
        const { imageData } = vp.getImageData();
        const eventDataList = [];
        slicePoints.forEach((x) => {
          const { pageX, pageY, clientX, clientY, worldCoord } =
            createNormalizedMouseEvent(imageData, x, element, vp);
          eventDataList.push({ pageX, pageY, clientX, clientY, worldCoord });
        });

        // Mouse Down
        let evt = new MouseEvent('mousedown', {
          target: element,
          buttons: 1,
          clientX: eventDataList[0].clientX,
          clientY: eventDataList[0].clientY,
          pageX: eventDataList[0].pageX,
          pageY: eventDataList[0].pageY,
        });
        element.dispatchEvent(evt);

        // Mouse move to put the end somewhere else
        eventDataList.forEach((x, index) => {
          if (index !== 0) {
            evt = new MouseEvent('mousemove', {
              target: element,
              buttons: 1,
              clientX: x.clientX,
              clientY: x.clientY,
              pageX: x.pageX,
              pageY: x.pageY,
            });
            document.dispatchEvent(evt);
          }
        });
      }

      function renderEventHandler() {
        drawAnnotation(firstSlicePoints);
        expectedContourCount++;
        attachEventHandler();

        element.removeEventListener(Events.IMAGE_RENDERED, renderEventHandler);
      }

      function attachEventHandler() {
        element.addEventListener(
          Events.IMAGE_RENDERED,
          function secondImageRendered() {
            // Second render is as a result of scrolling
            element.removeEventListener(
              Events.IMAGE_RENDERED,
              secondImageRendered
            );
            drawAnnotation(lastSlicePoints);
            expectedContourCount++;
          }
        );
      }

      element.addEventListener(Events.IMAGE_RENDERED, renderEventHandler);

      element.addEventListener(csToolsEvents.ANNOTATION_RENDERED, () => {
        const contourAnnotations = annotation.state.getAnnotations(
          interpolationToolName,
          element
        );

        expect(contourAnnotations).toBeDefined();
        expect(contourAnnotations.length).toBe(expectedContourCount);

        const contourAnnotation = contourAnnotations[expectedContourCount - 1];

        expect(contourAnnotation.metadata.toolName).toBe(interpolationToolName);

        // Mouse Up instantly after
        const evt = new MouseEvent('mouseup');
        document.dispatchEvent(evt);
        if (contourAnnotation.data.label === '') {
          contourAnnotation.data.label = 'Label1';
          triggerContourUpdateCallback(
            { element, viewport: vp },
            contourAnnotation
          );
        }
        if (expectedContourCount === 1) {
          scrollToIndex(vp, 3);
        }
      });

      element.addEventListener(
        EventTypes.ANNOTATION_INTERPOLATION_PROCESS_COMPLETED,
        (evt) => {
          const contourAnnotations = annotation.state.getAnnotations(
            interpolationToolName,
            element
          );
          contourAnnotations.forEach((x) => {
            expect(x.metadata.referencedImageId).toBe(
              imageIds[x.metadata.referencedSliceIndex]
            );
          });
          expect(contourAnnotations.length).toBe(4);
          done();
        }
      );

      const scrollToIndex = (viewportElement, index) => {
        scroll(viewportElement, {
          delta: index,
          debounceLoading: false,
          loop: false,
          volumeId,
          scrollSlabs: -1,
        });
        this.renderingEngine.render();
      };

      element.addEventListener(Events.IMAGE_RENDERED, renderEventHandler);

      this.stackToolGroup.addViewport(vp.id, this.renderingEngine.id);

      try {
        vp.setStack(imageIds, 0);
        this.renderingEngine.render();
      } catch (e) {
        done.fail(e);
      }
    });

    it('Should successfully create interpolated annotations with expected points', function (done) {
      const element = createViewport(
        this.renderingEngine,
        ViewportType.STACK,
        512,
        128
      );
      this.DOMElements.push(element);

      const imageIds = [
        'fakeImageLoader:imageURI_64_64_10_5_1_1_0',
        'fakeImageLoader:imageURI_64_64_0_20_1_1_0',
        'fakeImageLoader:imageURI_64_64_20_35_1_1_0',
        'fakeImageLoader:imageURI_64_64_5_25_1_1_0',
        'fakeImageLoader:imageURI_64_64_15_30_1_1_0',
      ];

      element.addEventListener(
        EventTypes.ANNOTATION_INTERPOLATION_PROCESS_COMPLETED,
        (evt) => {
          let contourAnnotations = annotation.state.getAnnotations(
            interpolationToolName,
            element
          );
          contourAnnotations = contourAnnotations.sort((a, b) => {
            const aSliceIndex = a.metadata.referencedSliceIndex;
            const bSliceIndex = b.metadata.referencedSliceIndex;
            if (aSliceIndex < bSliceIndex) {
              return -1;
            }
            if (aSliceIndex > bSliceIndex) {
              return 1;
            }
            return 0;
          });
          contourAnnotations.forEach((x, xIndex) => {
            expect(x.metadata.referencedImageId).toBe(
              imageIds[x.metadata.referencedSliceIndex]
            );
            const hasSamePoint = expectedContourSet[xIndex].every(
              (point, pIndex) => {
                return x.data.contour.polyline[pIndex].every(
                  (polylinePoint, pointIndex) => {
                    return point[pointIndex] === polylinePoint;
                  }
                );
              }
            );
            expect(hasSamePoint).toBe(true);
          });
          expect(contourAnnotations.length).toBe(5);
          done();
          contourAnnotations.forEach((x) => {
            annotation.state.removeAnnotation(x.annotationUID);
          });
        }
      );

      const vp = this.renderingEngine.getViewport(viewportId);

      element.addEventListener(Events.IMAGE_RENDERED, () => {
        // first slice points
        firstSliceAnnotation.metadata.referencedSliceIndex = 0;
        firstSliceAnnotation.metadata.referencedImageId = imageIds[0];
        firstSliceAnnotation.data.contour.polyline = firstSlicePoints;
        // last slice points
        lastSliceAnnotation.metadata.referencedSliceIndex = 4;
        lastSliceAnnotation.metadata.referencedImageId = imageIds[4];
        lastSliceAnnotation.data.contour.polyline = lastSlicePoints;

        annotation.state.addAnnotation(firstSliceAnnotation, element);
        annotation.state.addAnnotation(lastSliceAnnotation, element);

        const contourAnnotations = annotation.state.getAnnotations(
          interpolationToolName,
          element
        );

        triggerContourUpdateCallback(
          { element, viewport: vp },
          contourAnnotations[contourAnnotations.length - 1]
        );
      });

      this.stackToolGroup.addViewport(vp.id, this.renderingEngine.id);

      try {
        vp.setStack(imageIds, 0);
        this.renderingEngine.render();
      } catch (e) {
        done.fail(e);
      }
    });

    it('Should successfully delete all the auto generated contour annotations', function (done) {
      const element = createViewport(
        this.renderingEngine,
        ViewportType.STACK,
        512,
        128
      );
      this.DOMElements.push(element);

      const imageIds = [
        'fakeImageLoader:imageURI_64_64_10_5_1_1_0',
        'fakeImageLoader:imageURI_64_64_0_20_1_1_0',
        'fakeImageLoader:imageURI_64_64_10_5_3_2_0',
        'fakeImageLoader:imageURI_64_64_15_5_3_2_0',
      ];
      const vp = this.renderingEngine.getViewport(viewportId);
      let expectedContourCount = 0;

      function addAnnotation(slicePoints, index, label) {
        const { imageData } = vp.getImageData();
        const camera = vp.getCamera();
        const { viewPlaneNormal, viewUp } = camera;
        const FrameOfReferenceUID = vp.getFrameOfReferenceUID();
        const worldPoints = [];
        slicePoints.forEach((x) => {
          worldPoints.push(imageData.indexToWorld(x));
        });
        const contourAnnotation = {
          highlighted: true,
          invalidated: true,
          metadata: {
            viewPlaneNormal: [...viewPlaneNormal],
            viewUp: [...viewUp],
            FrameOfReferenceUID,
            referencedImageId: imageIds[index],
            referencedSliceIndex: index,
            toolName: interpolationToolName,
          },
          data: {
            handles: {
              points: [], // Handle points for open contours
              activeHandleIndex: null,
              textBox: {
                hasMoved: false,
                worldPosition: [0, 0, 0],
                worldBoundingBox: {
                  topLeft: [0, 0, 0],
                  topRight: [0, 0, 0],
                  bottomLeft: [0, 0, 0],
                  bottomRight: [0, 0, 0],
                },
              },
            },
            contour: {
              polyline: worldPoints, // Polyline coordinates
            },
            segmentation: dataSegmentation,
            label,
            cachedStats: {},
          },
          interpolationUID: '',
          autoGenerated: false,
        };
        annotation.state.addAnnotation(contourAnnotation, element);
        expectedContourCount++;
        triggerContourUpdateCallback(
          { element, viewport: vp },
          contourAnnotation
        );
      }

      const scrollToIndex = (viewportElement, index) => {
        scroll(viewportElement, {
          delta: 3,
          debounceLoading: false,
          loop: false,
          volumeId,
          scrollSlabs: -1,
        });
        this.renderingEngine.render();
      };

      function renderEventHandler() {
        addAnnotation(firstSlicePoints, 0, 'Label 1');
        attachEventHandler();

        element.removeEventListener(Events.IMAGE_RENDERED, renderEventHandler);
        scrollToIndex(vp, 3);
      }

      function attachEventHandler() {
        element.addEventListener(
          Events.IMAGE_RENDERED,
          function secondImageRendered() {
            // Second render is as a result of scrolling
            element.removeEventListener(
              Events.IMAGE_RENDERED,
              secondImageRendered
            );
            element.addEventListener(
              EventTypes.ANNOTATION_INTERPOLATION_PROCESS_COMPLETED,
              function () {
                let addedAnnotations = annotation.state.getAnnotations(
                  interpolationToolName,
                  element
                );
                expect(addedAnnotations).toBeDefined();
                if (addedAnnotations.length > 2) {
                  expect(addedAnnotations.length).toBe(
                    expectedContourCount + 2
                  );
                  const currentIndex = vp.getCurrentImageIdIndex();
                  const currentAnnotation = addedAnnotations.find(
                    (ann) => ann.metadata.referencedSliceIndex === currentIndex
                  );
                  annotation.state.removeAnnotation(
                    currentAnnotation.annotationUID
                  );
                }
              }
            );
            element.addEventListener(
              EventTypes.INTERPOLATED_ANNOTATIONS_REMOVED,
              function () {
                let addedAnnotations = annotation.state.getAnnotations(
                  interpolationToolName,
                  element
                );
                expect(addedAnnotations.length).toBe(1);
                done();
                addedAnnotations.forEach((x) => {
                  annotation.state.removeAnnotation(x.annotationUID);
                });
              }
            );
            addAnnotation(lastSlicePoints, 3, 'Label 1');
          }
        );
      }

      element.addEventListener(Events.IMAGE_RENDERED, renderEventHandler);

      this.stackToolGroup.addViewport(vp.id, this.renderingEngine.id);

      try {
        vp.setStack(imageIds, 0);
        this.renderingEngine.render();
      } catch (e) {
        done.fail(e);
      }
    });

    it('Should successfully edit auto generated contour annotation', function (done) {
      console.log('Start of edit of contour');
      const element = createViewport(
        this.renderingEngine,
        ViewportType.STACK,
        512,
        128
      );
      this.DOMElements.push(element);

      const imageIds = [
        'fakeImageLoader:imageURI_64_64_10_5_1_1_0',
        'fakeImageLoader:imageURI_64_64_0_20_1_1_0',
        'fakeImageLoader:imageURI_64_64_20_35_1_1_0',
        'fakeImageLoader:imageURI_64_64_5_25_1_1_0',
        'fakeImageLoader:imageURI_64_64_15_30_1_1_0',
      ];

      element.addEventListener(
        EventTypes.ANNOTATION_INTERPOLATION_PROCESS_COMPLETED,
        (evt) => {
          console.log('annotation interpolation process complete', evt);
          let contourAnnotations = annotation.state.getAnnotations(
            interpolationToolName,
            element
          );
          contourAnnotations = contourAnnotations.sort((a, b) => {
            const aSliceIndex = a.metadata.referencedSliceIndex;
            const bSliceIndex = b.metadata.referencedSliceIndex;
            if (aSliceIndex < bSliceIndex) {
              return -1;
            }
            if (aSliceIndex > bSliceIndex) {
              return 1;
            }
            return 0;
          });

          if (contourAnnotations.length === 5 && !isContourEdited) {
            setTimeout(() => {
              isContourEdited = true;
              console.log(
                '****** Triggering contour modified',
                contourAnnotations[2],
                ...contourAnnotations.map(
                  (it) => it.metadata.referencedSliceIndex
                )
              );
              contourAnnotations[2].data.contour.polyline = thirdSlicePoints;
              contourAnnotations[2].autoGenerated = false;
              triggerContourModifiedCallback(
                { element, viewport: vp },
                contourAnnotations[2]
              );
            }, 1);
            return;
          }
          console.log('Should be processing modified data now');
          contourAnnotations.forEach((x, xIndex) => {
            expect(x.metadata.referencedImageId).toBe(
              imageIds[x.metadata.referencedSliceIndex]
            );
            const hasSamePoint = expectedContourEditSet[xIndex].every(
              (point, pIndex) => {
                return x.data.contour.polyline[pIndex].every(
                  (polylinePoint, pointIndex) => {
                    return isEqual(point[pointIndex], polylinePoint);
                  }
                );
              }
            );
            expect(hasSamePoint).toBe(true);
          });
          expect(contourAnnotations.length).toBe(5);
          isContourEdited = false;
          done();
          contourAnnotations.forEach((x) => {
            annotation.state.removeAnnotation(x.annotationUID);
          });
        }
      );

      const vp = this.renderingEngine.getViewport(viewportId);

      element.addEventListener(Events.IMAGE_RENDERED, () => {
        // first slice points
        firstSliceAnnotation.metadata.referencedSliceIndex = 0;
        firstSliceAnnotation.metadata.referencedImageId = imageIds[0];
        firstSliceAnnotation.data.contour.polyline = firstSlicePoints;
        // last slice points
        lastSliceAnnotation.metadata.referencedSliceIndex = 4;
        lastSliceAnnotation.metadata.referencedImageId = imageIds[4];
        lastSliceAnnotation.data.contour.polyline = lastSliceEditCasePoints;

        annotation.state.addAnnotation(firstSliceAnnotation, element);
        annotation.state.addAnnotation(lastSliceAnnotation, element);

        const contourAnnotations = annotation.state.getAnnotations(
          interpolationToolName,
          element
        );

        triggerContourUpdateCallback(
          { element, viewport: vp },
          contourAnnotations[contourAnnotations.length - 1]
        );
      });

      this.stackToolGroup.addViewport(vp.id, this.renderingEngine.id);

      try {
        vp.setStack(imageIds, 0);
        this.renderingEngine.render();
      } catch (e) {
        done.fail(e);
      }
    });
  });
});

function triggerContourUpdateCallback(eventData, annotation) {
  const { element } = eventData;

  if (!element) {
    return;
  }

  const eventDetail = {
    annotation,
  };

  triggerEvent(
    eventTarget,
    csToolsEnums.Events.ANNOTATION_COMPLETED,
    eventDetail
  );
}

function triggerContourModifiedCallback(eventData, annotation) {
  const { element } = eventData;

  if (!element) {
    return;
  }
  const { viewportId, renderingEngineId } = getEnabledElement(element);

  const eventDetail = {
    annotation,
    renderingEngineId,
    viewportId,
  };

  triggerEvent(
    eventTarget,
    csToolsEnums.Events.ANNOTATION_MODIFIED,
    eventDetail
  );
}
