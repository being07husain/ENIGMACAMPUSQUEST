const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sources = [
  ["node_modules/three/build/three.min.js", "static/vendor/three.min.js"],
  ["node_modules/three/examples/js/controls/OrbitControls.js", "static/vendor/OrbitControls.js"],
  ["node_modules/three/LICENSE", "static/vendor/THREE-LICENSE.txt"],
];

for (const [source, destination] of sources) {
  const sourcePath = path.join(root, source);
  const destinationPath = path.join(root, destination);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

process.stdout.write("Vendored Three.js 0.128.0 and OrbitControls.\n");
