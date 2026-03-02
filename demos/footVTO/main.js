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

    enableFlipObject: true,
    threshold: _settings.threshold,
    maxHandsDetected: 1,

    scanSettings: {
      nScaleLevels: 1, // Faster startup
      scale0Factor: 0.6,
      multiDetectionSearchSlotsRate: 0.3,
    },

    NNsPaths: ["../../neuralNets/NN_FOOT_" + _settings.NNVersion + ".json"],

    VTOCanvas,
    handTrackerCanvas,
  })
    .then(startThree)
    .catch((err) => console.log("AR init error:", err));
}

function startThree(three) {
  document.getElementById("arLoader").style.display = "none";

  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  three.scene.add(ambient);

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

  loader.load(_settings.shoeRightPath, (gltf) => {
    const shoe = gltf.scene;
    transform(shoe);
    HandTrackerThreeHelper.add_threeObject(shoe);
  });

  loader.load(_settings.occluderPath, (gltf) => {
    const occluder = gltf.scene.children[0];
    transform(occluder);
    HandTrackerThreeHelper.add_threeOccluder(occluder);
  });
}
