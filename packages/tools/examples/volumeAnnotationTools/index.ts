import type { Types } from '@cornerstonejs/core';
import {
  RenderingEngine,
  Enums,
  setVolumesForViewports,
  volumeLoader,
  imageLoader,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
  addManipulationBindings,
} from '../../../../utils/demo/helpers';
import * as cornerstoneTools from '@cornerstonejs/tools';
import {
  encodeVolumeIdInfo,
  fakeImageLoader,
  fakeVolumeLoader,
} from '../../../../utils/test/testUtils';

console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const {
  EllipticalROITool,
  ToolGroupManager,
  StackScrollTool,
  ZoomTool,
  Enums: csToolsEnums,
} = cornerstoneTools;

const { ViewportType } = Enums;
const { MouseBindings } = csToolsEnums;

// Define a unique id for the volume
const volumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use
// const volumeId = `${volumeLoaderScheme}:${volumeName}`; // VolumeId with loader id + volume id

// ======== Set up page ======== //
setTitleAndDescription(
  'Annotation Tools On Volumes',
  'Here we demonstrate how annotation tools can be drawn/rendered on any plane.'
);

const size = '500px';
const content = document.getElementById('content');
const viewportGrid = document.createElement('div');

viewportGrid.style.display = 'flex';
viewportGrid.style.display = 'flex';
viewportGrid.style.flexDirection = 'row';

const element1 = document.createElement('div');
const element2 = document.createElement('div');
const element3 = document.createElement('div');
element1.oncontextmenu = () => false;
element2.oncontextmenu = () => false;
element3.oncontextmenu = () => false;

element1.style.width = size;
element1.style.height = size;
element2.style.width = size;
element2.style.height = size;
element3.style.width = size;
element3.style.height = size;

viewportGrid.appendChild(element1);
viewportGrid.appendChild(element2);
viewportGrid.appendChild(element3);

content.appendChild(viewportGrid);

const instructions = document.createElement('p');
instructions.innerText =
  'Left Click to draw length measurements on any viewport.\n Use the mouse wheel to scroll through the stack.';

content.append(instructions);
// ============================= //

const volumeId = encodeVolumeIdInfo({
  loader: 'fakeVolumeLoader',
  name: 'volumeURI',
  rows: 100,
  columns: 100,
  slices: 10,
  xSpacing: 1,
  ySpacing: 1,
  zSpacing: 1,
});

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();
  volumeLoader.registerVolumeLoader('fakeVolumeLoader', fakeVolumeLoader);
  imageLoader.registerImageLoader('fakeImageLoader', fakeImageLoader);

  const toolGroupId = 'STACK_TOOL_GROUP_ID';

  // Add tools to Cornerstone3D
  cornerstoneTools.addTool(EllipticalROITool);

  // Define a tool group, which defines how mouse events map to tool commands for
  // Any viewport using the group
  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
  addManipulationBindings(toolGroup);

  // Add the tools to the tool group and specify which volume they are pointing at
  toolGroup.addTool(EllipticalROITool.toolName, { volumeId });
  toolGroup.addTool(ZoomTool.toolName, { volumeId });
  toolGroup.addTool(StackScrollTool.toolName);

  // Set the initial state of the tools, here we set one tool active on left click.
  // This means left click will draw that tool.
  toolGroup.setToolActive(EllipticalROITool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Primary, // Left Click
      },
    ],
  });

  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Secondary, // Right Click
      },
    ],
  });

  // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
  // hook instead of mouse buttons, it does not need to assign any mouse button.
  toolGroup.setToolActive(StackScrollTool.toolName);

  // Get Cornerstone imageIds and fetch metadata into RAM
  // const ptImageIds = await createImageIdsAndCacheMetaData({
  //   StudyInstanceUID:
  //     '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
  //   SeriesInstanceUID:
  //     '1.3.6.1.4.1.14519.5.2.1.7009.2403.879445243400782656317561081015',
  //   wadoRsRoot: 'https://d33do7qe4w26qo.cloudfront.net/dicomweb',
  // });

  // const ctImageIds = await createImageIdsAndCacheMetaData({
  //   StudyInstanceUID:
  //     '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
  //   SeriesInstanceUID:
  //     '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
  //   wadoRsRoot: 'https://d33do7qe4w26qo.cloudfront.net/dicomweb',
  // });

  // const imageIds = ptImageIds;
  // Instantiate a rendering engine
  const renderingEngineId = 'myRenderingEngine';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // Create the viewports
  const viewportIds = [
    'CT_AXIAL_STACK',
    'CT_SAGITTAL_STACK',
    'CT_OBLIQUE_STACK',
  ];

  const viewportInputArray = [
    {
      viewportId: viewportIds[0],
      type: ViewportType.ORTHOGRAPHIC,
      element: element1,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
        background: <Types.Point3>[0.2, 0, 0.2],
      },
    },
    {
      viewportId: viewportIds[1],
      type: ViewportType.ORTHOGRAPHIC,
      element: element2,
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
        background: <Types.Point3>[0.2, 0, 0.2],
      },
    },
    {
      viewportId: viewportIds[2],
      type: ViewportType.ORTHOGRAPHIC,
      element: element3,
      defaultOptions: {
        orientation: {
          // Random oblique orientation
          viewUp: <Types.Point3>[
            -0.5962687530844388, 0.5453181550345819, -0.5891448751239446,
          ],
          viewPlaneNormal: <Types.Point3>[
            -0.5962687530844388, 0.5453181550345819, -0.5891448751239446,
          ],
        },
        background: <Types.Point3>[0.2, 0, 0.2],
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);

  // Set the tool group on the viewports
  viewportIds.forEach((viewportId) =>
    toolGroup.addViewport(viewportId, renderingEngineId)
  );

  // Define a volume in memory
  const volume = await volumeLoader.createAndCacheVolume(volumeId);

  // Set the volume to load
  await volume.load();

  await setVolumesForViewports(renderingEngine, [{ volumeId }], viewportIds);

  // Render the image
  renderingEngine.renderViewports(viewportIds);
}

run();
