let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let CURRENT_SHOE = null;
let THREE_CONTEXT = null;
let GLTF_LOADER = null;

const isAndroid = /Android/i.test(navigator.userAgent);

const _settings = {
  threshold: isAndroid ? 0.8 : 0.9,
  NNVersion: 31,
  occluderPath: "assets/occluder.glb",
  scale: 0.95,
  translation: [0, -0.02, 0],
};

function setFullScreen(cv) {
  cv.width = cv.clientWidth;
  cv.height = cv.clientHeight;
}

function initAR() {
  if (AR_INITIALIZED) return;

  AR_INITIALIZED = true;
  window.AR_INITIALIZED = true;

  const handTrackerCanvas = document.getElementById("handTrackerCanvas");
  const VTOCanvas = document.getElementById("ARCanvas");

  setFullScreen(handTrackerCanvas);
  setFullScreen(VTOCanvas);

  setTimeout(
    () => {
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

        enableFlipObject: true,
        threshold: _settings.threshold,
        maxHandsDetected: 2,

        videoSettings: {
          facingMode: "environment",
          width: { ideal: isAndroid ? 640 : 960 },
          height: { ideal: isAndroid ? 480 : 720 },
        },

        scanSettings: {
          nScaleLevels: isAndroid ? 1 : 2,
          scale0Factor: 0.6,
          multiDetectionSearchSlotsRate: isAndroid ? 0.3 : 0.5,
          disableIsRightHandNNEval: false,
          translationScalingFactors: [0.3, 0.3, 0.8],
        },

        landmarksStabilizerSpec: {
          minCutOff: 0.0005,
          beta: 12,
        },

        NNsPaths: ["../../neuralNets/NN_FOOT_" + _settings.NNVersion + ".json"],

        VTOCanvas,
        handTrackerCanvas,
      })
        .then(startThree)
        .catch((err) => console.log("AR init error:", err));
    },
    isAndroid ? 300 : 0,
  );
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

  // Load occluder
  GLTF_LOADER.load(_settings.occluderPath, (gltf) => {
    const occluder = gltf.scene.children[0];
    occluder.scale.multiplyScalar(_settings.scale);
    occluder.position.add(new THREE.Vector3().fromArray(_settings.translation));
    HandTrackerThreeHelper.add_threeOccluder(occluder);
  });

  // Initial shoe
  loadShoe(window.SELECTED_SHOE_MODEL || "assets/shoe1.glb");
}

function loadShoe(modelPath) {
  if (!THREE_CONTEXT || !GLTF_LOADER) return;

  // Properly remove previous shoe from helper
  if (CURRENT_SHOE) {
    HandTrackerThreeHelper.remove_threeObject(CURRENT_SHOE);

    CURRENT_SHOE.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    CURRENT_SHOE = null;
  }

  GLTF_LOADER.load(
    modelPath,
    (gltf) => {
      const shoe = gltf.scene;

      shoe.scale.multiplyScalar(_settings.scale);
      shoe.position.add(new THREE.Vector3().fromArray(_settings.translation));
      shoe.frustumCulled = false;

      CURRENT_SHOE = shoe;

      HandTrackerThreeHelper.add_threeObject(shoe);
    },
    undefined,
    (error) => {
      console.error("Model load error:", error);
    },
  );
}
