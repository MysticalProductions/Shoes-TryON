let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let CURRENT_SHOE = null;
let THREE_CONTEXT = null;
let GLTF_LOADER = null;

const isAndroid = /Android/i.test(navigator.userAgent);

const _settings = {
  threshold: 0.75,
  NNVersion: 31,
  occluderPath: "assets/occluder.glb",
  scale: 0.95,
  translation: [0, -0.015, 0],
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
        maxHandsDetected: 1, // performance boost

        videoSettings: {
          facingMode: "environment",
          width: { ideal: isAndroid ? 480 : 720 },
          height: { ideal: isAndroid ? 360 : 540 },
        },

        scanSettings: {
          nScaleLevels: 3,
          scale0Factor: 0.6,
          multiDetectionSearchSlotsRate: 0.4,
          disableIsRightHandNNEval: true,
          translationScalingFactors: [0.25, 0.25, 1.0],
        },

        landmarksStabilizerSpec: {
          minCutOff: 0.01,
          beta: 5,
        },

        NNsPaths: ["../../neuralNets/NN_FOOT_" + _settings.NNVersion + ".json"],

        VTOCanvas,
        handTrackerCanvas,
      })
        .then(startThree)
        .catch((err) => console.error("AR init error:", err));
    },
    isAndroid ? 150 : 0,
  );
}

function startThree(three) {
  THREE_CONTEXT = three;

  const loaderEl = document.getElementById("arLoader");
  if (loaderEl) loaderEl.style.display = "none";

  // Renderer optimization
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;
  three.renderer.physicallyCorrectLights = true;

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  three.scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(0, 2, 2);
  three.scene.add(directional);

  // GLTF Loader
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

  // Preload initial shoe
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

  // Remove old shoe properly
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

      shoe.scale.multiplyScalar(_settings.scale);
      shoe.position.add(new THREE.Vector3().fromArray(_settings.translation));

      shoe.traverse((child) => {
        child.frustumCulled = false;
        if (child.material) child.material.needsUpdate = true;
      });

      CURRENT_SHOE = shoe;

      HandTrackerThreeHelper.add_threeObject(shoe);
    },
    undefined,
    (error) => {
      console.error("Model load error:", error);
    },
  );
}
