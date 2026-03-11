let AR_INITIALIZED = false;
window.AR_INITIALIZED = false;

let THREE_CONTEXT = null;
let GLTF_LOADER = null;
let CURRENT_LEFT_SHOE = null;
let CURRENT_RIGHT_SHOE = null;

const _settings = {
  threshold: 0.75,
  scale: 0.95,
  translation: [0, -0.015, 0],
  occluderPath: "assets/occluder.glb",
};

// ... keep setFullScreen and initAR functions the same as previous versions ...

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

  // Load Occluder
  GLTF_LOADER.load(_settings.occluderPath, (gltf) => {
    const occluder = gltf.scene.children[0];
    occluder.scale.multiplyScalar(_settings.scale);
    occluder.position.add(new THREE.Vector3().fromArray(_settings.translation));
    HandTrackerThreeHelper.add_threeOccluder(occluder);
  });

  // Start the dual shoe loading process
  if (window.SELECTED_LEFT_SHOE && window.SELECTED_RIGHT_SHOE) {
    loadShoes(window.SELECTED_LEFT_SHOE, window.SELECTED_RIGHT_SHOE);
  }
}

function loadShoes(leftPath, rightPath) {
  if (!THREE_CONTEXT || !GLTF_LOADER) return;

  // Cleanup existing objects
  HandTrackerThreeHelper.clear_threeObjects();
  if (CURRENT_LEFT_SHOE) disposeModel(CURRENT_LEFT_SHOE);
  if (CURRENT_RIGHT_SHOE) disposeModel(CURRENT_RIGHT_SHOE);

  // Load both files in parallel
  const promiseLeft = new Promise((resolve) =>
    GLTF_LOADER.load(leftPath, resolve),
  );
  const promiseRight = new Promise((resolve) =>
    GLTF_LOADER.load(rightPath, resolve),
  );

  Promise.all([promiseLeft, promiseRight])
    .then(([leftGltf, rightGltf]) => {
      CURRENT_LEFT_SHOE = leftGltf.scene;
      CURRENT_RIGHT_SHOE = rightGltf.scene;

      [CURRENT_LEFT_SHOE, CURRENT_RIGHT_SHOE].forEach((shoe) => {
        shoe.scale.multiplyScalar(_settings.scale);
        shoe.position.add(new THREE.Vector3().fromArray(_settings.translation));
        shoe.traverse((child) => {
          child.frustumCulled = false;
          if (child.material) child.material.needsUpdate = true;
        });
      });

      // Map [Left Shoe, Right Shoe] to [First detected foot, Second detected foot]
      HandTrackerThreeHelper.add_threeObjects([
        CURRENT_LEFT_SHOE,
        CURRENT_RIGHT_SHOE,
      ]);
    })
    .catch((err) => console.error("Error loading shoe models:", err));
}

function disposeModel(model) {
  model.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
  THREE_CONTEXT.scene.remove(model);
}
