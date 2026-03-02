let AR_INITIALIZED = false;

const _settings = {
  threshold: 0.85,
  NNVersion: 31,

  shoeRightPath: "assets/shoe.glb", // DRACO compressed
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

    enableFlipObject: true, // 👈 automatic left/right flip
    threshold: _settings.threshold,
    maxHandsDetected: 2, // 👈 detect both feet

    scanSettings: {
      nScaleLevels: 2, // better stability
      scale0Factor: 0.6,
      multiDetectionSearchSlotsRate: 0.4,
      disableIsRightHandNNEval: false,
    },

    landmarksStabilizerSpec: {
      minCutOff: 0.001,
      beta: 8, // 👈 smoother, less shaky
    },

    NNsPaths: ["../../neuralNets/NN_FOOT_" + _settings.NNVersion + ".json"],

    VTOCanvas,
    handTrackerCanvas,
  })
    .then(startThree)
    .catch((err) => console.log("AR init error:", err));
}

function startThree(three) {
  // Hide loader safely
  const loaderEl = document.getElementById("arLoader");
  if (loaderEl) loaderEl.style.display = "none";

  // Renderer configuration
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  three.scene.add(ambient);

  // ===== DRACO SETUP =====
  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  const loader = new THREE.GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  function transform(obj) {
    obj.scale.multiplyScalar(_settings.scale);
    obj.position.add(new THREE.Vector3().fromArray(_settings.translation));
  }

  // ===== LOAD SHOE (ONLY ONCE) =====
  loader.load(
    _settings.shoeRightPath,
    (gltf) => {
      const shoe = gltf.scene;

      transform(shoe);

      // Add once — helper duplicates per detected foot
      HandTrackerThreeHelper.add_threeObject(shoe);
    },
    undefined,
    (error) => {
      console.error("Shoe load error:", error);
    },
  );

  // ===== LOAD OCCLUDER (ONLY ONCE) =====
  loader.load(
    _settings.occluderPath,
    (gltf) => {
      const occluder = gltf.scene.children[0];

      transform(occluder);

      HandTrackerThreeHelper.add_threeOccluder(occluder);
    },
    undefined,
    (error) => {
      console.error("Occluder load error:", error);
    },
  );
}
