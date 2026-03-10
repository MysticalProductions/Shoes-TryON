let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let CURRENT_SHOE = null;
let THREE_CONTEXT = null;
let GLTF_LOADER = null;

const _settings = {
  threshold: 0.6,
  scale: 1,
  translation: [0, -0.02, 0],
  occluderPath: "assets/occluder.glb",
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

    VTOCanvas,
    handTrackerCanvas,

    maxHandsDetected: 2,

    // Barefoot neural network
    NNsPaths: ["../../neuralNets/NN_BAREFOOT_3.json"],

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
    .catch((err) => {
      console.log("AR init error:", err);
    });
}

function startThree(three) {
  THREE_CONTEXT = three;

  const loader = document.getElementById("arLoader");
  if (loader) loader.style.display = "none";

  // renderer settings
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;

  // lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  const point = new THREE.PointLight(0xffffff, 2);
  three.scene.add(ambient, point);

  // -----------------------------
  // DRACO LOADER (fix for error)
  // -----------------------------
  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  GLTF_LOADER = new THREE.GLTFLoader();
  GLTF_LOADER.setDRACOLoader(dracoLoader);

  // load occluder
  GLTF_LOADER.load(_settings.occluderPath, function (gltf) {
    const occluder = gltf.scene.children[0];

    occluder.scale.multiplyScalar(_settings.scale);
    occluder.position.add(new THREE.Vector3().fromArray(_settings.translation));

    HandTrackerThreeHelper.add_threeOccluder(occluder);
  });

  // load first shoe
  loadShoe(window.SELECTED_SHOE_MODEL || "assets/shoe1.glb");
}

function disposeModel(model) {
  model.traverse((child) => {
    if (child.geometry) child.geometry.dispose();

    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      } else {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }
  });
}

function loadShoe(modelPath) {
  if (!THREE_CONTEXT || !GLTF_LOADER) return;

  // remove previous shoe
  if (CURRENT_SHOE) {
    HandTrackerThreeHelper.clear_threeObjects();

    disposeModel(CURRENT_SHOE);

    THREE_CONTEXT.scene.remove(CURRENT_SHOE);

    CURRENT_SHOE = null;
  }

  GLTF_LOADER.load(
    modelPath,
    function (gltf) {
      const shoe = gltf.scene;

      shoe.scale.multiplyScalar(_settings.scale);
      shoe.position.add(new THREE.Vector3().fromArray(_settings.translation));

      CURRENT_SHOE = shoe;

      HandTrackerThreeHelper.add_threeObject(shoe);
    },
    undefined,
    function (error) {
      console.error("Model load error:", error);
    },
  );
}
