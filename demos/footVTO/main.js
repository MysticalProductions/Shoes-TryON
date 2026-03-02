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
    maxHandsDetected: 2,
    disableIsRightHandNNEval: false,

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

  loader.load(_settings.shoePath, (gltf) => {
    const rightShoe = gltf.scene;
    const leftShoe = gltf.scene.clone(true);

    // Normal right shoe
    transform(rightShoe);

    // Mirror for left shoe
    transform(leftShoe);
    leftShoe.scale.x *= -1;

    // Fix material side (important for mirrored meshes)
    leftShoe.traverse((obj) => {
      if (obj.isMesh) {
        obj.material.side = THREE.DoubleSide;
      }
    });

    HandTrackerThreeHelper.add_threeObject(rightShoe);
    HandTrackerThreeHelper.add_threeObject(leftShoe);
  });

  loader.load(_settings.occluderPath, (gltf) => {
    const occluderRight = gltf.scene.children[0];
    const occluderLeft = occluderRight.clone();

    transform(occluderRight);

    transform(occluderLeft);
    occluderLeft.scale.x *= -1;

    HandTrackerThreeHelper.add_threeOccluder(occluderRight);
    HandTrackerThreeHelper.add_threeOccluder(occluderLeft);
  });
}
