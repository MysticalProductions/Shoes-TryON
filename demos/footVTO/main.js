let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let CURRENT_SHOE = null;
let THREE_CONTEXT = null;
let GLTF_LOADER = null;

const isAndroid = /Android/i.test(navigator.userAgent);

const _settings = {
  threshold: 0.6, // Reduced slightly from 0.9 for easier initial detection
  NNVersion: 31,
  occluderPath: "assets/occluder.glb",
  scale: 0.95,
  translation: [0, -0.02, 0],
  isModelLightMapped: true,
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

    enableFlipObject: true, // Mirrors the right-foot model to the left foot
    cameraZoom: 1,
    freeZRot: false,
    threshold: _settings.threshold,

    scanSettings: {
      multiDetectionSearchSlotsRate: 0.5,
      multiDetectionMaxOverlap: 0.3,
      multiDetectionOverlapScaleXY: [0.5, 1],
      multiDetectionEqualizeSearchSlotScale: true,
      multiDetectionForceSearchOnOtherSide: true,
      multiDetectionForceChirality: 1,
      disableIsRightHandNNEval: true,
      overlapFactors: [1.0, 1.0, 1.0],
      translationScalingFactors: [0.3, 0.3, 1],
      nScaleLevels: 2,
      scale0Factor: 0.5,
    },

    VTOCanvas: VTOCanvas,
    handTrackerCanvas: handTrackerCanvas,

    // Strictly using your specified versioned path
    NNsPaths: [
      "../../neuralNets/NN_FOOT_" + _settings.NNVersion.toString() + ".json",
    ],

    maxHandsDetected: 2,

    stabilizationSettings: {
      NNSwitchMask: {
        isRightHand: false,
        isFlipped: false,
      },
    },

    landmarksStabilizerSpec: {
      minCutOff: 0.001,
      beta: 5,
    },
  })
    .then(startThree)
    .catch((err) => console.error("AR init error:", err));
}

function startThree(three) {
  THREE_CONTEXT = three;
  const loaderEl = document.getElementById("arLoader");
  if (loaderEl) loaderEl.style.display = "none";

  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  three.scene.add(ambient);

  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  GLTF_LOADER = new THREE.GLTFLoader();
  GLTF_LOADER.setDRACOLoader(dracoLoader);

  GLTF_LOADER.load(_settings.occluderPath, (gltf) => {
    const occluder = gltf.scene.children[0];
    occluder.scale.multiplyScalar(_settings.scale);
    occluder.position.add(new THREE.Vector3().fromArray(_settings.translation));
    HandTrackerThreeHelper.add_threeOccluder(occluder);
  });

  if (window.SELECTED_SHOE_MODEL) {
    loadShoe(window.SELECTED_SHOE_MODEL);
  }
}

function loadShoe(modelPath) {
  if (!THREE_CONTEXT || !GLTF_LOADER) return;

  if (CURRENT_SHOE) {
    HandTrackerThreeHelper.clear_threeObjects();
    THREE_CONTEXT.scene.remove(CURRENT_SHOE);
  }

  GLTF_LOADER.load(modelPath, (gltf) => {
    CURRENT_SHOE = gltf.scene;

    CURRENT_SHOE.scale.multiplyScalar(_settings.scale);
    CURRENT_SHOE.position.add(
      new THREE.Vector3().fromArray(_settings.translation),
    );

    CURRENT_SHOE.traverse((child) => {
      child.frustumCulled = false;
      if (child.material) child.material.needsUpdate = true;
    });

    // Mirrors model for the other foot automatically
    HandTrackerThreeHelper.add_threeObject(CURRENT_SHOE);
  });
}
