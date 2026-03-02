let AR_INITIALIZED = false;

const isAndroid = /Android/i.test(navigator.userAgent);

const _settings = {
  threshold: isAndroid ? 0.8 : 0.9,
  NNVersion: 31,

  shoeRightPath: "assets/shoe.glb",
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

  // Small warm-up delay helps Android camera startup
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
        maxHandsDetected: 2,

        // 📱 Android camera optimization
        videoSettings: {
          facingMode: "environment",
          width: { ideal: isAndroid ? 640 : 960 },
          height: { ideal: isAndroid ? 480 : 720 },
        },

        scanSettings: {
          nScaleLevels: isAndroid ? 1 : 2,
          scale0Factor: 0.6,
          multiDetectionSearchSlotsRate: isAndroid ? 0.3 : 0.5,
          disableIsRightHandNNEval: false,
          translationScalingFactors: [0.3, 0.3, 0.8],
        },

        // Strong smoothing to reduce jitter
        landmarksStabilizerSpec: {
          minCutOff: 0.0005,
          beta: 12,
        },

        NNsPaths: ["../../neuralNets/NN_FOOT_" + _settings.NNVersion + ".json"],

        VTOCanvas,
        handTrackerCanvas,
      })
        .then(startThree)
        .catch((err) => console.log("AR init error:", err));
    },
    isAndroid ? 300 : 0,
  );
}

function startThree(three) {
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
    obj.frustumCulled = false;
  }

  // ===== LOAD SHOE (ONLY ONCE) =====
  loader.load(
    _settings.shoeRightPath,
    (gltf) => {
      const shoe = gltf.scene;
      transform(shoe);

      // Helper duplicates automatically per detected foot
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
