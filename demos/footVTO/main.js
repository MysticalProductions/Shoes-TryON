let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let CURRENT_SHOE = null;
let THREE_CONTEXT = null;
let GLTF_LOADER = null;

const isAndroid = /Android/i.test(navigator.userAgent);

const _settings = {
  threshold: 0.7, // Detection sensitivity from shared code
  NNVersion: 31, // Best version from shared code
  occluderPath: "assets/occluder.glb",
  scale: 0.95,
  translation: [0, -0.02, 0], // Updated translation from shared code
  isModelLightMapped: true,
};

const _states = {
  notLoaded: -1,
  loading: 0,
  running: 1,
  busy: 2,
};
let _state = _states.notLoaded;

function setFullScreen(cv) {
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
}

function initAR() {
  if (AR_INITIALIZED) return;

  AR_INITIALIZED = true;
  window.AR_INITIALIZED = true;
  _state = _states.loading;

  const handTrackerCanvas = document.getElementById("handTrackerCanvas");
  const VTOCanvas = document.getElementById("ARCanvas");

  setFullScreen(handTrackerCanvas);
  setFullScreen(VTOCanvas);

  // Initialize helper with parameters from shared code
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

    enableFlipObject: true, // Crucial for left/right mirroring
    cameraZoom: 1,
    freeZRot: false,
    threshold: _settings.threshold,

    // High-performance scan settings from shared code
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
    debugDisplayLandmarks: false,

    // Using the specific NN path requirement
    NNsPaths: [
      "../../neuralNets/NN_FOOT_" + _settings.NNVersion.toString() + ".json",
    ],

    maxHandsDetected: 2,

    // Specific stabilization from shared code
    stabilizationSettings: {
      NNSwitchMask: {
        isRightHand: false,
        isFlipped: false,
      },
    },

    landmarksStabilizerSpec: {
      minCutOff: 0.001,
      beta: 5, // Lower = more stabilized
    },
  })
    .then(function (three) {
      handTrackerCanvas.style.zIndex = 3; // iOS Safari fix
      startThree(three);
    })
    .catch((err) => console.error("AR init error:", err));
}

function startThree(three) {
  THREE_CONTEXT = three;

  const loaderEl = document.getElementById("arLoader");
  if (loaderEl) loaderEl.style.display = "none";

  _state = _states.running;

  // Renderer setup
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;

  // Lighting setup based on model mapping
  if (!_settings.isModelLightMapped) {
    const pointLight = new THREE.PointLight(0xffffff, 2);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    three.scene.add(pointLight, ambientLight);
  } else {
    // Basic ambient light for lightmapped models
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    three.scene.add(ambient);
  }

  // Initialize GLTF Loader with Draco support
  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );
  GLTF_LOADER = new THREE.GLTFLoader();
  GLTF_LOADER.setDRACOLoader(dracoLoader);

  // Load occluder
  GLTF_LOADER.load(_settings.occluderPath, (gltf) => {
    const occluder = gltf.scene.children[0];
    applyTransform(occluder);
    HandTrackerThreeHelper.add_threeOccluder(occluder);
  });

  // Preload initial shoe from UI selection
  loadShoe(window.SELECTED_SHOE_MODEL || "assets/shoe1.glb");
}

function applyTransform(obj) {
  obj.scale.multiplyScalar(_settings.scale);
  obj.position.add(new THREE.Vector3().fromArray(_settings.translation));
}

function loadShoe(modelPath) {
  if (!THREE_CONTEXT || !GLTF_LOADER) return;

  // Properly clear previous objects
  if (CURRENT_SHOE) {
    HandTrackerThreeHelper.clear_threeObjects();
    disposeModel(CURRENT_SHOE);
    THREE_CONTEXT.scene.remove(CURRENT_SHOE);
    CURRENT_SHOE = null;
  }

  GLTF_LOADER.load(
    modelPath,
    (gltf) => {
      const shoe = gltf.scene;
      applyTransform(shoe);

      shoe.traverse((child) => {
        child.frustumCulled = false;
        if (child.material) child.material.needsUpdate = true;
      });

      CURRENT_SHOE = shoe;
      HandTrackerThreeHelper.add_threeObject(shoe); // Engine mirrors this
    },
    undefined,
    (error) => console.error("Model load error:", error),
  );
}

function disposeModel(model) {
  model.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}
