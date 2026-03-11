let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let THREE_CONTEXT = null;
let GLTF_LOADER = null;
let CURRENT_SHOE = null;
let RIGHT_SHOE = null;
let LEFT_SHOE = null;

const _settings = {
  threshold: 0.75,
  scale: 0.95,
  translation: [0, -0.015, 0],
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
    maxHandsDetected: 2,

    VTOCanvas,
    handTrackerCanvas,

    NNsPaths: ["../../neuralNets/NN_BAREFOOT_3.json"],

    landmarksStabilizerSpec: {
      minCutOff: 0.01,
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

  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);

  directional.position.set(0, 2, 2);

  three.scene.add(ambient, directional);

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

      // IMPORTANT: only add ONE object
      HandTrackerThreeHelper.add_threeObject(shoe);
    },

    undefined,

    (error) => {
      console.error("Model load error:", error);
    },
  );
}
