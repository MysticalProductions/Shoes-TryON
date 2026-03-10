let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let THREE_CONTEXT = null;
let GLTF_LOADER = null;

const _settings = {
  threshold: 0.7, // higher = easier detection
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

    maxHandsDetected: 2, // allow 2 feet

    VTOCanvas,
    handTrackerCanvas,

    NNsPaths: ["../../neuralNets/NN_BAREFOOT_3.json"],

    stabilizationSettings: {
      NNSwitchMask: {
        isRightHand: false,
        isFlipped: false,
      },
    },

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

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  const point = new THREE.PointLight(0xffffff, 1.5);

  three.scene.add(ambient, point);

  // DRACO loader
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

  loadShoes(window.SELECTED_SHOE_MODEL || "assets/shoe1.glb");
}

function loadShoes(modelPath) {
  if (!GLTF_LOADER) return;

  GLTF_LOADER.load(modelPath, function (gltf) {
    const shoe1 = gltf.scene;
    const shoe2 = gltf.scene.clone();

    shoe1.scale.multiplyScalar(_settings.scale);
    shoe2.scale.multiplyScalar(_settings.scale);

    shoe1.position.add(new THREE.Vector3().fromArray(_settings.translation));
    shoe2.position.add(new THREE.Vector3().fromArray(_settings.translation));

    // attach shoes to both feet
    HandTrackerThreeHelper.add_threeObject(shoe1);
    HandTrackerThreeHelper.add_threeObject(shoe2);
  });
}
