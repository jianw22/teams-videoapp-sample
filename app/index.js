microsoftTeams.initialize(() => {}, [
  "https://microsoft.github.io",
  "https://lubobill1990.github.io",
]);

// This is the effect for processing
let appliedEffect = {
  pixelValue: 100,
  proportion: 3,
};

let effectIds = {
  half: "c2cf81fd-a1c0-4742-b41a-ef969b3ed490",
  gray: "b0c8896c-7be8-4645-ae02-a8bc9b0355e5",
  dimmergl: "1f54f360-1111-49b5-8c4c-e81e593db53f",
  timeout: "1f54f360-9999-49b5-8c4c-e81e593db53f",
}

// This is the effect linked with UI
let uiSelectedEffect = {};
let selectedEffectId = undefined;
let errorOccurs = false;
let useSimpleEffect = false;
function simpleHalfEffect(videoFrame) {
  const maxLen =
    (videoFrame.height * videoFrame.width) /
    Math.max(1, appliedEffect.proportion) - 4;

  for (let i = 1; i < maxLen; i += 4) {
    //smaple effect just change the value to 100, which effect some pixel value of video frame
    videoFrame.data[i + 1] = appliedEffect.pixelValue;
  }
}

let canvas = new OffscreenCanvas(480,360);
let videoFilter = new WebglVideoFilter(canvas);
videoFilter.init();
let dimmerglFilter = new DimmerglFilter();
dimmerglFilter.init();

//Sample video effect
function videoFrameHandler(videoFrame, notifyVideoProcessed, notifyError) {
  switch (selectedEffectId) {
    case effectIds.half:
      simpleHalfEffect(videoFrame);
      break;
    case effectIds.gray:
      videoFilter.processVideoFrame(videoFrame);
      break;
    case effectIds.dimmergl:
      dimmerglFilter.processVideoFrame(videoFrame);
      break;
    case effectIds.timeout:
      return; // no process
    default:
      break;
  }
 
  //send notification the effect processing is finshed.
  notifyVideoProcessed();
  
  //send error to Teams if any
  // if (errorOccurs) {
  //   notifyError("some error message");
  // }
}

function clearSelect() {
  document.getElementById("filter-half").classList.remove("selected");
  document.getElementById("filter-gray").classList.remove("selected");
  document.getElementById("filter-dimmergl").classList.remove("selected");
  document.getElementById("filter-timeout").classList.remove("selected");
}

function effectParameterChanged(effectId) {
  console.log(effectId);
  if (selectedEffectId === effectId) {
    console.log('effect not changed');
    return;
  }
  selectedEffectId = effectId;

  clearSelect();
  switch (selectedEffectId) {
    case effectIds.half:
      console.log('current effect: half');
      document.getElementById("filter-half").classList.add("selected");
      break;
    case effectIds.gray:
      console.log('current effect: gray');
      document.getElementById("filter-gray").classList.add("selected");
      break;
    case effectIds.dimmergl:
      console.log('current effect: dimmergl');
      document.getElementById("filter-dimmergl").classList.add("selected");
      break;
    case effectIds.timeout:
      console.log('current effect: timeout');
      document.getElementById("filter-timeout").classList.add("selected");
      break;
    default:
      console.log('effect cleared');
      break;
  }
}

microsoftTeams.appInitialization.notifySuccess();
microsoftTeams.video.registerForVideoEffect(effectParameterChanged);
microsoftTeams.video.registerForVideoFrame(videoFrameHandler, {
  format: "NV12",
});

// any changes to the UI should notify Teams client.
const filterHalf = document.getElementById("filter-half");
filterHalf.addEventListener("click", function () {
  if (selectedEffectId === effectIds.half) {
    return;
  }
  microsoftTeams.video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.half);
});
const filterGray = document.getElementById("filter-gray");
filterGray.addEventListener("click", function () {
  if (selectedEffectId === effectIds.gray) {
    return;
  }
  microsoftTeams.video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.gray);
});

const filterDimmergl = document.getElementById("filter-dimmergl");
filterDimmergl.addEventListener("click", function () {
  if (selectedEffectId === effectIds.dimmergl) {
    return;
  }
  microsoftTeams.video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.dimmergl);
});

const filterTimeout = document.getElementById("filter-timeout");
filterTimeout.addEventListener("click", function () {
  if (selectedEffectId === effectIds.timeout) {
    return;
  }
  microsoftTeams.video.notifySelectedVideoEffectChanged("EffectChanged", effectIds.timeout);
});
