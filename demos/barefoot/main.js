let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let THREE_CONTEXT = null;
let GLTF_LOADER = null;

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

  if (RIGHT_SHOE) {
    HandTrackerThreeHelper.clear_threeObjects();

    disposeModel(RIGHT_SHOE);
    disposeModel(LEFT_SHOE);

    RIGHT_SHOE = null;
    LEFT_SHOE = null;
  }

  GLTF_LOADER.load(modelPath, (gltf) => {
    const right = gltf.scene;

    const left = right.clone(true);

    // mirror for left shoe
    left.scale.x *= -1;

    right.scale.multiplyScalar(_settings.scale);
    left.scale.multiplyScalar(_settings.scale);

    right.position.add(new THREE.Vector3().fromArray(_settings.translation));
    left.position.add(new THREE.Vector3().fromArray(_settings.translation));

    RIGHT_SHOE = right;
    LEFT_SHOE = left;

    // FIX: attach to separate detection slots
    HandTrackerThreeHelper.add_threeObject(RIGHT_SHOE, { poseIndex: 0 });
    HandTrackerThreeHelper.add_threeObject(LEFT_SHOE, { poseIndex: 1 });
  });
}
