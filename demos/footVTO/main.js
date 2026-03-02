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

    scanSettings: {
      nScaleLevels: 1,
      scale0Factor: 0.6,
      multiDetectionSearchSlotsRate: 0.3,
      disableIsRightHandNNEval: false,
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

  // Renderer setup
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

  // ===== LOAD SHOE (Single Model → Clone for Left) =====
  loader.load(
    _settings.shoeRightPath,
    (gltf) => {
      const rightShoe = gltf.scene;
      const leftShoe = gltf.scene.clone(true);

      // Right shoe
      transform(rightShoe);

      // Left shoe (mirror)
      transform(leftShoe);
      leftShoe.scale.x *= -1;

      // Fix material side for mirrored geometry
      leftShoe.traverse((obj) => {
        if (obj.isMesh) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => (m.side = THREE.DoubleSide));
          } else {
            obj.material.side = THREE.DoubleSide;
          }
        }
      });

      HandTrackerThreeHelper.add_threeObject(rightShoe);
      HandTrackerThreeHelper.add_threeObject(leftShoe);
    },
    undefined,
    (error) => {
      console.error("Shoe load error:", error);
    },
  );

  // ===== LOAD OCCLUDERS =====
  loader.load(
    _settings.occluderPath,
    (gltf) => {
      const occluderRight = gltf.scene.children[0];
      const occluderLeft = occluderRight.clone();

      transform(occluderRight);

      transform(occluderLeft);
      occluderLeft.scale.x *= -1;

      HandTrackerThreeHelper.add_threeOccluder(occluderRight);
      HandTrackerThreeHelper.add_threeOccluder(occluderLeft);
    },
    undefined,
    (error) => {
      console.error("Occluder load error:", error);
    },
  );
}
