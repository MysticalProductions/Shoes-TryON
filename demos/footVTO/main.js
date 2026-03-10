let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let CURRENT_MODE = "foot"; // foot | barefoot

let THREE_CONTEXT = null;
let GLTF_LOADER = null;
let CURRENT_SHOE = null;

const _settings = {
  threshold: 0.75,
  NNVersion: 31,
  occluderPath: "assets/occluder.glb",
  scale: 0.95,
  translation: [0, -0.015, 0],
};

/* --------- select NN --------- */

function getNNPath() {
  return CURRENT_MODE === "barefoot"
    ? "../../neuralNets/NN_BAREFOOT_" + _settings.NNVersion + ".json"
    : "../../neuralNets/NN_FOOT_" + _settings.NNVersion + ".json";
}

/* --------- resize canvas --------- */

function setFullScreen(cv) {
  cv.width = cv.clientWidth;
  cv.height = cv.clientHeight;
}

/* --------- init AR --------- */

function initAR() {
  if (AR_INITIALIZED) return;

  AR_INITIALIZED = true;

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

    enableFlipObject: true,
    threshold: _settings.threshold,

    videoSettings: {
      facingMode: "environment",
    },

    NNsPaths: [getNNPath()],

    VTOCanvas,
    handTrackerCanvas,
  })
    .then(startThree)
    .catch((e) => {
      console.error("AR init error:", e);
      AR_INITIALIZED = false;
    });
}

/* --------- THREE setup --------- */

function startThree(three) {
  THREE_CONTEXT = three;

  const loader = document.getElementById("arLoader");
  if (loader) loader.style.display = "none";

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  three.scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(0, 2, 2);
  three.scene.add(dir);

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

/* --------- load shoe --------- */

function loadShoe(modelPath) {
  if (!THREE_CONTEXT || !GLTF_LOADER) return;

  if (CURRENT_SHOE) {
    HandTrackerThreeHelper.clear_threeObjects();
    THREE_CONTEXT.scene.remove(CURRENT_SHOE);
    CURRENT_SHOE = null;
  }

  GLTF_LOADER.load(modelPath, (gltf) => {
    const shoe = gltf.scene;

    shoe.scale.multiplyScalar(_settings.scale);
    shoe.position.add(new THREE.Vector3().fromArray(_settings.translation));

    CURRENT_SHOE = shoe;

    HandTrackerThreeHelper.add_threeObject(shoe);
  });
}

/* --------- SAFE MODE SWITCH --------- */

function switchFootMode(mode) {
  if (mode === CURRENT_MODE) return;

  CURRENT_MODE = mode;

  const loader = document.getElementById("arLoader");
  if (loader) loader.style.display = "flex";

  AR_INITIALIZED = false;

  try {
    if (window.WebARRocksHand) {
      WebARRocksHand.destroy();
    }
  } catch (e) {
    console.warn(e);
  }

  THREE_CONTEXT = null;
  CURRENT_SHOE = null;

  /* critical: wait for camera + WebGL to release */
  setTimeout(() => {
    initAR();
  }, 800);
}
