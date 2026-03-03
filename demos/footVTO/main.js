let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let THREE_CONTEXT = null;
let GLTF_LOADER = null;
let SHOE_CONTAINER = null;

const DEBUG_AXES = true;

const isAndroid = /Android/i.test(navigator.userAgent);

const _settings = {
  threshold: isAndroid ? 0.8 : 0.9,
  NNVersion: 31,
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
        maxHandsDetected: 2,
        videoSettings: {
          facingMode: "environment",
          width: { ideal: isAndroid ? 640 : 960 },
          height: { ideal: isAndroid ? 480 : 720 },
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
  THREE_CONTEXT = three;

  const loaderEl = document.getElementById("arLoader");
  if (loaderEl) loaderEl.style.display = "none";

  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.outputEncoding = THREE.sRGBEncoding;

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  three.scene.add(ambient);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  three.scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(0, 5, 5);
  three.scene.add(dirLight);

  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  GLTF_LOADER = new THREE.GLTFLoader();
  GLTF_LOADER.setDRACOLoader(dracoLoader);

  // Create container with transform
  SHOE_CONTAINER = new THREE.Object3D();
  SHOE_CONTAINER.scale.multiplyScalar(_settings.scale);
  SHOE_CONTAINER.position.add(
    new THREE.Vector3().fromArray(_settings.translation),
  );
  SHOE_CONTAINER.frustumCulled = false;

  HandTrackerThreeHelper.add_threeObject(SHOE_CONTAINER);

  // Debug Axes
  if (DEBUG_AXES) {
    const axes = new THREE.AxesHelper(0.15);
    SHOE_CONTAINER.add(axes);
  }

  // Load first shoe
  loadShoe(window.SELECTED_SHOE_MODEL || "assets/shoe1.glb");

  // Load occluder
  GLTF_LOADER.load(_settings.occluderPath, (gltf) => {
    const occluder = gltf.scene.children[0];
    occluder.scale.multiplyScalar(_settings.scale);
    occluder.position.add(new THREE.Vector3().fromArray(_settings.translation));
    HandTrackerThreeHelper.add_threeOccluder(occluder);
  });
}

function loadShoe(modelPath) {
  if (!GLTF_LOADER || !SHOE_CONTAINER) return;

  // Remove old model
  while (SHOE_CONTAINER.children.length > 0) {
    const child = SHOE_CONTAINER.children[0];
    SHOE_CONTAINER.remove(child);

    child.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) {
          c.material.forEach((m) => m.dispose());
        } else {
          c.material.dispose();
        }
      }
    });
  }

  GLTF_LOADER.load(
    modelPath,
    (gltf) => {
      const shoe = gltf.scene;
      SHOE_CONTAINER.add(shoe);
    },
    undefined,
    (error) => {
      console.error("Model load error:", error);
    },
  );
}
