let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let THREE_CONTEXT = null;
let GLTF_LOADER = null;
let CURRENT_SHOE = null;

const _settings = {
  threshold: 0.6,
  scale: 1,
  translation: [0, -0.02, 0],
  occluderPath: "assets/occluder.glb",
};

function setFullScreen(cv) {
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
}

function initAR() {
  if (AR_INITIALIZED) return;
  AR_INITIALIZED = true;
  window.AR_INITIALIZED = true;

  const handTrackerCanvas = document.getElementById("handTrackerCanvas");
  const VTOCanvas = document.getElementById("ARCanvas");

  setFullScreen(handTrackerCanvas);
  setFullScreen(VTOCanvas);

  HandTrackerThreeHelper.init({
    poseLandmarksLabels: [
      "ankleBack",
      "ankleOut",
      "ankleIn",
      "ankleFront",
      "heelBackOut",
      "heelBackIn",
      "pinkyToeBaseTop",
      "middleToeBaseTop",
      "bigToeBaseTop",
    ],
    poseFilter: PoseFlipFilter.instance({}),
    enableFlipObject: true,
    threshold: _settings.threshold,
    maxHandsDetected: 2,
    scanSettings: {
      multiDetectionSearchSlotsRate: 0.5,
      multiDetectionMaxOverlap: 0.3,
      multiDetectionOverlapScaleXY: [0.5, 1],
      multiDetectionEqualizeSearchSlotScale: true,
      multiDetectionForceSearchOnOtherSide: true,
      multiDetectionForceChirality: 1,
      disableIsRightHandNNEval: true,
      overlapFactors: [1.0, 1.0, 1.0],
      translationScalingFactors: [0.3, 0.3, 1.0],
      nScaleLevels: 2,
      scale0Factor: 0.5,
    },
    VTOCanvas: VTOCanvas,
    handTrackerCanvas: handTrackerCanvas,
    NNsPaths: ["../../neuralNets/NN_BAREFOOT_3.json"],
    landmarksStabilizerSpec: {
      minCutOff: 0.001,
      beta: 5,
    },
  })
    .then(startThree)
    .catch((err) => {
      console.error("AR init error:", err);
    });
}

function startThree(three) {
  THREE_CONTEXT = three;
  const loader = document.getElementById("arLoader");
  if (loader) loader.style.display = "none";

  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 2, 2);
  three.scene.add(ambientLight, directionalLight);

  // Correct DRACO initialization
  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  GLTF_LOADER = new THREE.GLTFLoader();
  GLTF_LOADER.setDRACOLoader(dracoLoader); // Fixes "No DRACOLoader instance" error

  GLTF_LOADER.load(_settings.occluderPath, function (gltf) {
    const occluder = gltf.scene.children[0];
    applyTransform(occluder);
    HandTrackerThreeHelper.add_threeOccluder(occluder);
  });

  if (window.SELECTED_SHOE_MODEL) {
    loadShoe(window.SELECTED_SHOE_MODEL);
  }
}

function applyTransform(obj) {
  obj.scale.multiplyScalar(_settings.scale);
  obj.position.add(new THREE.Vector3().fromArray(_settings.translation));
}

function loadShoe(modelPath) {
  if (!THREE_CONTEXT || !GLTF_LOADER) return;

  if (CURRENT_SHOE) {
    HandTrackerThreeHelper.clear_threeObjects();
    THREE_CONTEXT.scene.remove(CURRENT_SHOE);
  }

  GLTF_LOADER.load(modelPath, function (gltf) {
    CURRENT_SHOE = gltf.scene;
    applyTransform(CURRENT_SHOE);
    HandTrackerThreeHelper.add_threeObject(CURRENT_SHOE); // Engine handles mirroring
  });
}
