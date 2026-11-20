(() => {
  "use strict";

  const THREE = window.THREE;
  const DEG = Math.PI / 180;
  const campusLocations = [
    { name: "Main Gate", label: "MAIN GATE", icon: "GATE", x: 0, z: 59, kind: "gate", size: [13, 6] },
    { name: "Main Academic Block", label: "ACADEMIC HALL", icon: "HALL", x: -42, z: -11, kind: "academic", size: [16, 10] },
    { name: "IT Block", label: "INNOVATION LAB", icon: "LAB", x: 37, z: -25, kind: "lab", size: [14, 10] },
    { name: "Library", label: "DIGITAL LIBRARY", icon: "BOOKS", x: -27, z: -38, kind: "library", size: [15, 10] },
    { name: "Auditorium", label: "AUDITORIUM", icon: "STAGE", x: -39, z: 23, kind: "auditorium", size: [17, 11] },
    { name: "Canteen", label: "CAMPUS CAFÉ", icon: "CAFÉ", x: 20, z: 39, kind: "cafe", size: [11, 8] },
    { name: "Management Block", label: "STUDENT HUB", icon: "HUB", x: 0, z: 24, kind: "hub", size: [13, 10] },
    { name: "Sports Ground", label: "SPORTS GROUND", icon: "FIELD", x: 60, z: 44, kind: "sports", size: [27, 20] },
    { name: "Hostel", label: "KNOWLEDGE TOWER", icon: "TOWER", x: 2, z: -56, kind: "tower", size: [11, 11] },
    { name: "Garden", label: "MYSTERY GARDEN", icon: "GARDEN", x: 40, z: 24, kind: "garden", size: [15, 12] },
    { name: "Administration", label: "QUEST BOARD", icon: "QUESTS", x: 15, z: -3, kind: "board", size: [8, 6] },
    { name: "Parking", label: "GAME ARENA", icon: "ARENA", x: 43, z: 1, kind: "arena", size: [14, 10] },
  ];

  const makeMaterial = (color, extra = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.04,
    ...extra,
  });

  const createCampusWorld = ({ container, tooltip, onSelect, onHover, onAmenitySelect }) => {
    if (!THREE || !THREE.OrbitControls) {
      throw new Error("The local 3D campus renderer could not be loaded.");
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#101735");
    scene.fog = new THREE.Fog("#101735", 150, 360);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 260);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.domElement.className = "campus-webgl";
    renderer.domElement.setAttribute("aria-label", "3D campus world. Select a landmark to open its details.");
    container.append(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.screenSpacePanning = true;
    controls.minPolarAngle = 15 * DEG;
    controls.maxPolarAngle = 85 * DEG;
    controls.minDistance = 34;
    controls.maxDistance = 145;
    controls.target.set(0, 0, 0);
    controls.update();

    const materials = {
      ground: makeMaterial("#142c25", { roughness: 1 }),
      groundTop: makeMaterial("#18382c", { roughness: 1 }),
      soil: makeMaterial("#30291f"),
      foundation: makeMaterial("#101735"),
      towerWall: makeMaterial("#202f5c"),
      wall: makeMaterial("#d8c79f"),
      wallLight: makeMaterial("#e7d7ae"),
      stone: makeMaterial("#8b8173"),
      stoneLight: makeMaterial("#a99d8b"),
      roof: makeMaterial("#182652"),
      roofLight: makeMaterial("#26396d"),
      roofPurple: makeMaterial("#342b61"),
      window: makeMaterial("#f4c95d", { emissive: "#d4af37", emissiveIntensity: 0.34 }),
      glass: makeMaterial("#315879", { metalness: 0.12, roughness: 0.34 }),
      blueGlass: makeMaterial("#3b82f6", { emissive: "#1d4ed8", emissiveIntensity: 0.24, metalness: 0.1, roughness: 0.32 }),
      arenaGlass: makeMaterial("#49376b", { emissive: "#7c4dff", emissiveIntensity: 0.28, metalness: 0.08, roughness: 0.34 }),
      wood: makeMaterial("#50341f"),
      leaf: makeMaterial("#183b2c"),
      leafLight: makeMaterial("#315b3c"),
      path: makeMaterial("#8b8173", { roughness: 0.98 }),
      pathEdge: makeMaterial("#a99d8b"),
      road: makeMaterial("#465365", { roughness: 0.96 }),
      parking: makeMaterial("#303c50", { roughness: 0.96 }),
      cricketTurf: makeMaterial("#397b53", { roughness: 1 }),
      banner: makeMaterial("#172348"),
      gold: makeMaterial("#f4c95d", { emissive: "#d4af37", emissiveIntensity: 0.25, metalness: 0.12 }),
      paleGold: makeMaterial("#f3d38a", { emissive: "#bb8030", emissiveIntensity: 0.2 }),
      purple: makeMaterial("#7c4dff", { emissive: "#5932ba", emissiveIntensity: 0.28 }),
      blue: makeMaterial("#60a5fa", { emissive: "#3b82f6", emissiveIntensity: 0.25 }),
      explored: makeMaterial("#60a5fa", { emissive: "#3b82f6", emissiveIntensity: 0.2 }),
      green: makeMaterial("#83c58b", { emissive: "#2f8048", emissiveIntensity: 0.2 }),
      sportsField: makeMaterial("#367b50", { roughness: 1 }),
      sportsFieldAlt: makeMaterial("#2d6d46", { roughness: 1 }),
      sportsTrack: makeMaterial("#a96550", { roughness: 0.96 }),
      courtBlue: makeMaterial("#426a9b", { roughness: 0.92 }),
      courtPurple: makeMaterial("#514879", { roughness: 0.92 }),
      chalk: makeMaterial("#fff1d4", { roughness: 0.9 }),
      orange: makeMaterial("#d78042", { emissive: "#9b4d24", emissiveIntensity: 0.14 }),
      cafeRed: makeMaterial("#b83c45", { emissive: "#6f1825", emissiveIntensity: 0.12 }),
      juice: makeMaterial("#5c9a71"),
      iceCream: makeMaterial("#c87b9a"),
      steel: makeMaterial("#758496", { metalness: 0.3, roughness: 0.42 }),
      paper: makeMaterial("#e5d9bd"),
      locked: makeMaterial("#555b70"),
      lamp: makeMaterial("#f4c95d", { emissive: "#d4af37", emissiveIntensity: 0.55 }),
      water: makeMaterial("#316f72", { emissive: "#19474e", emissiveIntensity: 0.12, roughness: 0.3 }),
      skin: makeMaterial("#dfb58b"),
    };

    const ground = new THREE.Group();
    ground.name = "Campus terrain and paths";
    scene.add(ground);
    const locationLayer = new THREE.Group();
    locationLayer.name = "Campus landmarks";
    scene.add(locationLayer);
    const decorationLayer = new THREE.Group();
    decorationLayer.name = "Campus landscaping";
    scene.add(decorationLayer);
    const geometryCache = new Map();
    const sharedGeometryTypes = new Set(["CircleGeometry", "OctahedronGeometry", "RingGeometry", "SphereGeometry", "TorusGeometry"]);
    const getGeometry = (key, create) => {
      if (!geometryCache.has(key)) geometryCache.set(key, create());
      return geometryCache.get(key);
    };

    const hemisphere = new THREE.HemisphereLight("#c4d3e3", "#142c25", 0.54);
    scene.add(hemisphere);
    const ambient = new THREE.AmbientLight("#68769b", 0.16);
    scene.add(ambient);
    const sunlight = new THREE.DirectionalLight("#f2d8aa", 0.86);
    sunlight.position.set(-42, 72, 40);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -88;
    sunlight.shadow.camera.right = 88;
    sunlight.shadow.camera.top = 78;
    sunlight.shadow.camera.bottom = -78;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 220;
    sunlight.shadow.bias = -0.00035;
    scene.add(sunlight);
    const violetFill = new THREE.PointLight("#856bc5", 0.48, 55, 2);
    violetFill.position.set(15, 17, 3);
    scene.add(violetFill);
    const plazaFill = new THREE.PointLight("#f3c878", 0.5, 38, 2);
    plazaFill.position.set(0, 11, 0);
    scene.add(plazaFill);

    const makeMesh = (geometry, material, parent, position = [0, 0, 0], castShadow = true) => {
      if (sharedGeometryTypes.has(geometry.type)) {
        const key = `${geometry.type}:${JSON.stringify(geometry.parameters)}`;
        if (geometryCache.has(key)) {
          geometry.dispose();
          geometry = geometryCache.get(key);
        } else {
          geometryCache.set(key, geometry);
        }
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const box = (parent, material, x, y, z, sx, sy, sz) =>
      makeMesh(getGeometry(`box:${sx}:${sy}:${sz}`, () => new THREE.BoxGeometry(sx, sy, sz)), material, parent, [x, y, z]);
    const cylinder = (parent, material, x, y, z, rt, rb, height, sides = 8) =>
      makeMesh(getGeometry(`cylinder:${rt}:${rb}:${height}:${sides}`, () => new THREE.CylinderGeometry(rt, rb, height, sides)), material, parent, [x, y, z]);
    const cone = (parent, material, x, y, z, radius, height, sides = 5) =>
      makeMesh(getGeometry(`cone:${radius}:${height}:${sides}`, () => new THREE.ConeGeometry(radius, height, sides)), material, parent, [x, y, z]);

    const makeRibbon = (points, width, material, y = 0.19) => {
      const curvePoints = points.map(([x, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const steps = Math.max(20, points.length * 14);
      const vertices = [];
      const indices = [];
      for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        const point = curve.getPoint(t);
        const tangent = curve.getTangent(t).setY(0).normalize();
        const sideX = -tangent.z * width * 0.5;
        const sideZ = tangent.x * width * 0.5;
        vertices.push(point.x - sideX, y, point.z - sideZ, point.x + sideX, y, point.z + sideZ);
        if (index < steps) {
          const a = index * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const strip = makeMesh(geometry, material, ground, [0, 0, 0], false);
      strip.receiveShadow = true;
      return strip;
    };

    const campusShape = new THREE.Shape();
    campusShape.moveTo(-66, -62);
    campusShape.quadraticCurveTo(-76, -56, -76, -42);
    campusShape.lineTo(-77, 35);
    campusShape.quadraticCurveTo(-76, 56, -62, 63);
    campusShape.lineTo(-39, 68);
    campusShape.lineTo(20, 69);
    campusShape.quadraticCurveTo(58, 70, 69, 60);
    campusShape.lineTo(77, 39);
    campusShape.lineTo(76, -43);
    campusShape.quadraticCurveTo(74, -62, 57, -66);
    campusShape.lineTo(20, -69);
    campusShape.lineTo(-39, -68);
    campusShape.closePath();
    const turf = makeMesh(new THREE.ExtrudeGeometry(campusShape, { depth: 1.6, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.7, bevelThickness: 0.45 }), materials.ground, ground, [0, -1.8, 0], false);
    turf.rotation.x = -Math.PI / 2;
    turf.receiveShadow = true;
    const groundCap = makeMesh(new THREE.ShapeGeometry(campusShape, 2), materials.groundTop, ground, [0, -0.18, 0], false);
    groundCap.rotation.x = -Math.PI / 2;
    groundCap.receiveShadow = true;
    const grassZoneMaterials = [
      makeMaterial("#214936", { roughness: 1 }),
      makeMaterial("#1b402f", { roughness: 1 }),
      makeMaterial("#254b36", { roughness: 1 }),
    ];
    [
      [-56, -31, 12, 12], [-27, -53, 13, 7], [1, -44, 11, 8],
      [20, -48, 12, 8], [-58, 5, 10, 13], [-20, 14, 11, 8],
      [23, 16, 11, 8], [53, 7, 9, 12], [8, 53, 9, 5],
    ].forEach(([x, z, rx, rz], index) => {
      const zone = makeMesh(new THREE.CircleGeometry(1, 32), grassZoneMaterials[index % grassZoneMaterials.length], ground, [x, -0.09, z], false);
      zone.rotation.x = -Math.PI / 2;
      zone.scale.set(rx, rz, 1);
    });

    const boundaryCurves = [
      [[-66, -62], [-76, -42], [-77, 35], [-62, 63], [-39, 68], [-8, 69]],
      [[14, 69], [58, 70], [69, 60], [77, 39], [76, -43], [57, -66], [20, -69], [-39, -68], [-66, -62]],
    ].map((points) => new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z))));
    boundaryCurves.forEach((curve) => {
      makeMesh(new THREE.TubeGeometry(curve, 80, 0.45, 6, false), materials.stoneLight, ground, [0, 0.25, 0], false);
      for (let i = 0; i <= 22; i += 1) {
        const p = curve.getPoint(i / 22);
        const post = cylinder(ground, materials.wood, p.x, 0.5, p.z, 0.17, 0.2, 1.05, 6);
        post.castShadow = false;
      }
    });

    const plaza = makeMesh(new THREE.CylinderGeometry(12.8, 13.2, 0.35, 48), materials.path, ground, [0, 0.15, 0], false);
    plaza.receiveShadow = true;
    makeMesh(new THREE.TorusGeometry(10.8, 0.13, 6, 48), materials.pathEdge, ground, [0, 0.38, 0], false).rotation.x = -Math.PI / 2;
    const fountain = new THREE.Group();
    fountain.position.set(0, 0.43, 0);
    ground.add(fountain);
    cylinder(fountain, materials.stoneLight, 0, 0.25, 0, 2.7, 3, 0.5, 12);
    cylinder(fountain, materials.water, 0, 0.56, 0, 2.48, 2.55, 0.12, 20);
    cylinder(fountain, materials.stone, 0, 1.12, 0, 0.55, 0.8, 1.1, 8);
    cylinder(fountain, materials.water, 0, 1.74, 0, 1.1, 0.7, 0.16, 12);
    makeMesh(new THREE.SphereGeometry(0.2, 8, 6), materials.lamp, fountain, [0, 2.15, 0], false);

    const routeMaterial = materials.path;
    const edgeMaterial = materials.pathEdge;
    const campusRoutes = [
      { from: "Main Gate", to: "Management Block", points: [[0, 59], [1, 49], [0, 40], [-6, 34], [-10, 27], [-9, 20]], width: 4.8 },
      { from: "Main Gate", to: "Vehicle Parking", points: [[0, 59], [-1, 55], [-6, 52], [-14, 51], [-21, 53]], width: 3.4, road: true },
      { from: "Vehicle Parking", to: "Main Academic Block", points: [[-21, 53], [-27, 44], [-29, 33], [-29, 20], [-29, 8], [-32, 0], [-37, -6]], width: 2.5 },
      { from: "Management Block", to: "Plaza", points: [[-9, 20], [-13, 14], [-13, 7], [-9, 3]], width: 4.3 },
      { from: "Plaza", to: "Main Academic Block", points: [[-9, -7], [-19, -10], [-29, -9], [-37, -6]], width: 3.2 },
      { from: "Plaza", to: "IT Block", points: [[9, -7], [19, -11], [27, -17], [32, -21]], width: 3.2 },
      { from: "Plaza", to: "Library", points: [[-4, -12], [-13, -21], [-18, -27], [-18, -32]], width: 3.3 },
      { from: "Library", to: "Hostel", points: [[-18, -32], [-14, -31], [-9, -35], [-5, -43], [-4, -50], [2, -49]], width: 2.5 },
      { from: "Main Academic Block", to: "Auditorium", points: [[-37, -6], [-30, 0], [-28, 8], [-28, 17], [-32, 23]], width: 2.5 },
      { from: "Main Academic Block", to: "Cricket Practice Net", points: [[-47, 0], [-51, -11], [-53, -22], [-51, -31], [-53, -37], [-55, -41.5]], width: 1.7 },
      { from: "IT Block", to: "Parking", points: [[32, -21], [37, -15], [39, -8], [37, -2], [33, 0]], width: 2.5 },
      { from: "Parking", to: "Canteen", points: [[33, 0], [31, 10], [27, 20], [23, 31], [17, 34]], width: 2.5 },
      { from: "Parking", to: "Garden", points: [[33, 0], [39, 7], [44, 13], [47, 18], [45, 22]], width: 2.2 },
      { from: "Garden", to: "Sports Ground", points: [[45, 22], [48, 28], [51, 36], [49, 39]], width: 3 },
      { from: "Plaza", to: "Administration", points: [[10, -6], [13, -4], [14, -3], [11, -3]], width: 1.8 },
      { from: "Management Block", to: "Canteen", points: [[6, 24], [13, 27], [20, 33], [17, 34]], width: 2.4 },
      { from: "Plaza", to: "Auditorium", points: [[-9, 7], [-18, 13], [-25, 18], [-31, 23], [-32, 23]], width: 2.2 },
      { from: "Main Gate", to: "Shuttle Stop", points: [[0, 59], [-2, 56], [0, 53], [5, 50]], width: 1.7 },
      { from: "Shuttle Stop", to: "Information Kiosk", points: [[5, 50], [10, 53], [17, 53], [20, 50], [18, 47], [18, 44]], width: 1.45 },
      { from: "Information Kiosk", to: "Main Gate", points: [[18, 44], [22, 51], [20, 59], [11, 64], [0, 59]], width: 1.5 },
      { from: "Nescafé", to: "Food Street", points: [[6, 36.5], [6, 30], [12, 25], [22, 21], [29, 18], [34, 16], [37, 16], [45, 18], [47, 27], [43, 32], [38, 32]], width: 1.5 },
      { from: "Food Street", to: "Canteen", points: [[38, 32], [38, 36], [34, 39], [30, 39], [24, 33], [17, 34]], width: 1.5 },
      { from: "Library", to: "Campus Bookstore", points: [[-18, -32], [-15, -36], [-13, -40], [-13, -38]], width: 1.3 },
      { from: "Main Academic Block", to: "Campus Stationery", points: [[-37, -6], [-43, -4], [-47, -4], [-49, -5]], width: 1.35 },
      { from: "Campus Stationery", to: "Print & Copy", points: [[-49, -5], [-53, -8], [-55, -13]], width: 1.2 },
      { from: "Print & Copy", to: "Library", points: [[-55, -13], [-50, -19], [-40, -27], [-28, -32], [-18, -32]], width: 1.3 },
    ];
    campusRoutes.forEach(({ points, width, road = false }) => {
      makeRibbon(points, width + 0.32, edgeMaterial, 0.16);
      const isPrimary = road || width >= 4;
      makeRibbon(points, width, isPrimary ? materials.road : routeMaterial, 0.21);
    });
    const gateApproach = [[0, 76], [0, 70], [0, 64], [0, 59]];
    makeRibbon(gateApproach, 8.5, edgeMaterial, 0.15);
    makeRibbon(gateApproach, 7.8, materials.road, 0.2);
    [-2.35, 2.35].forEach((x) => {
      for (let index = 0; index < 3; index += 1) {
        box(ground, materials.chalk, x, 0.23, 72 - index * 2.3, 0.18, 0.035, 1.05);
      }
    });
    const routeGraph = new Map();
    campusRoutes.forEach((route) => {
      [route.from, route.to].forEach((location) => {
        if (!routeGraph.has(location)) routeGraph.set(location, []);
        routeGraph.get(location).push(route);
      });
    });
    const locationExits = new Map([
      ["Main Gate", [0, 54.5]], ["Management Block", [-9, 20]],
      ["Library", [-18, -32]], ["Hostel", [2, -49]],
      ["Main Academic Block", [-37, -6]], ["IT Block", [32, -21]],
      ["Auditorium", [-32, 23]], ["Canteen", [17, 34]],
      ["Parking", [33, 0]], ["Garden", [45, 22]],
      ["Sports Ground", [49, 39]], ["Administration", [11, -3]],
      ["Vehicle Parking", [-21, 53]], ["Cricket Practice Net", [-55, -41.5]],
      ["Shuttle Stop", [5, 50]], ["Information Kiosk", [18, 44]],
      ["Nescafé", [6, 36.5]], ["Food Street", [38, 32]],
      ["Campus Bookstore", [-13, -38]], ["Campus Stationery", [-49, -5]],
      ["Print & Copy", [-55, -13]],
    ]);

    const makeTree = (x, z, scale = 1, tint = false) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0.15, z);
      tree.scale.setScalar(scale);
      decorationLayer.add(tree);
      cylinder(tree, materials.wood, 0, 1.05, 0, 0.27, 0.38, 2.1, 6);
      cone(tree, tint ? materials.leafLight : materials.leaf, 0, 2.75, 0, 1.55, 2.8, 7);
      cone(tree, tint ? materials.leaf : materials.leafLight, 0, 3.9, 0, 1.08, 2.25, 7);
      return tree;
    };
    const treePlacements = [
      [-68, -45, 1.15], [-68, -8, 0.92], [-68, 33, 1.1], [-62, 56, 0.95],
      [-47, 61, 1], [-41, -62, 0.9], [-20, 62, 0.95], [21, 62, 1.1],
      [48, 59, 0.9], [67, 54, 1.05], [70, 25, 1.15], [70, -5, 1],
      [69, -37, 0.95], [55, -57, 1.1], [20, -60, 0.9], [-35, -61, 1.05],
      [-56, -29, 0.72], [-61, 9, 0.78], [51, 15, 0.78], [51, 32, 0.72],
      [28, 54, 0.8], [63, 46, 0.72], [-57, 42, 0.75], [28, -50, 0.75],
    ];
    treePlacements.forEach(([x, z, scale], index) => makeTree(x, z, scale, index % 4 === 0));

    const pedestrianFurniture = [];
    const makeBench = (x, z, rotation = 0) => {
      const bench = new THREE.Group();
      bench.position.set(x, 0.2, z);
      bench.rotation.y = rotation;
      decorationLayer.add(bench);
      pedestrianFurniture.push([x, z, 1.15]);
      box(bench, materials.wood, 0, 0.72, 0, 2.3, 0.22, 0.55);
      box(bench, materials.wood, 0, 1.2, -0.2, 2.3, 0.72, 0.18);
      [-0.8, 0.8].forEach((xPos) => box(bench, materials.stone, xPos, 0.35, 0, 0.17, 0.72, 0.2));
    };
    const makeLamp = (x, z, glowLight = true) => {
      const lamp = new THREE.Group();
      lamp.position.set(x, 0.2, z);
      decorationLayer.add(lamp);
      cylinder(lamp, materials.wood, 0, 1.65, 0, 0.12, 0.17, 3.3, 8);
      cylinder(lamp, materials.gold, 0, 3.35, 0, 0.43, 0.48, 0.22, 8);
      makeMesh(new THREE.SphereGeometry(0.32, 8, 6), materials.lamp, lamp, [0, 3.2, 0], false);
      if (glowLight) {
        const glow = new THREE.PointLight("#f3ca7d", 1.4, 8, 2);
        glow.position.set(0, 3, 0);
        lamp.add(glow);
      }
    };
    [[-11, 0], [11, 0], [-10, 13], [10, 13], [-13, -3], [13, -3], [-26, -30], [-38, -4], [34, -22]].forEach(([x, z]) => makeLamp(x, z, false));
    [[-8, -3, 0], [8, -3, Math.PI], [-29, -27, 0], [-45, -3, Math.PI / 2], [33, -20, 0], [48, 14, Math.PI / 2]].forEach(([x, z, rotation]) => makeBench(x, z, rotation));

    const makeFlowerBed = (x, z, radius = 1.2) => {
      const bed = makeMesh(new THREE.CylinderGeometry(radius, radius * 1.05, 0.35, 10), materials.leaf, decorationLayer, [x, 0.12, z], false);
      bed.receiveShadow = true;
      for (let index = 0; index < 5; index += 1) {
        const angle = (Math.PI * 2 * index) / 5;
        makeMesh(new THREE.SphereGeometry(0.18, 6, 5), index % 2 ? materials.purple : materials.gold, decorationLayer, [x + Math.cos(angle) * radius * 0.55, 0.48, z + Math.sin(angle) * radius * 0.55], false);
      }
    };
    const makeSocialCourtyard = () => {
      const courtyard = new THREE.Group();
      courtyard.position.set(20, 0.11, 29);
      decorationLayer.add(courtyard);
      const paving = makeMesh(new THREE.CircleGeometry(1, 40), materials.pathEdge, courtyard, [0, 0, 0], false);
      paving.rotation.x = -Math.PI / 2;
      paving.scale.set(7.2, 5.8, 1);
      const inset = makeMesh(new THREE.CircleGeometry(1, 40), materials.path, courtyard, [0, 0.08, 0], false);
      inset.rotation.x = -Math.PI / 2;
      inset.scale.set(6.7, 5.3, 1);
      makeMesh(new THREE.TorusGeometry(4.9, 0.08, 6, 36), materials.gold, courtyard, [0, 0.12, 0], false).rotation.x = -Math.PI / 2;
      cylinder(courtyard, materials.stoneLight, 0, 0.3, 0, 1.25, 1.45, 0.5, 12);
      cylinder(courtyard, materials.water, 0, 0.6, 0, 1.18, 1.2, 0.12, 16);
      cylinder(courtyard, materials.stone, 0, 1.05, 0, 0.34, 0.55, 0.8, 8);
      makeMesh(new THREE.SphereGeometry(0.16, 8, 6), materials.lamp, courtyard, [0, 1.55, 0], false);
      [[-3.3, -2.2], [3.3, -2.2], [-3.3, 2.2], [3.3, 2.2]].forEach(([x, z], index) => {
        cylinder(courtyard, materials.wood, x, 0.72, z, 0.65, 0.72, 0.18, 10);
        cylinder(courtyard, materials.roof, x, 0.42, z, 0.1, 0.13, 0.78, 8);
        box(courtyard, materials.wood, x, 0.8, z - 1.05, 1.1, 0.16, 0.45);
        cylinder(courtyard, materials.roof, x, 2.45, z, 0.08, 0.1, 2.9, 8);
        cone(courtyard, index % 2 ? materials.purple : materials.orange, x, 3.65, z, 1.2, 0.52, 9);
      });
      [[-6.2, 0], [6.2, 0]].forEach(([x, z], index) => {
        makeTreeIn(courtyard, x, z, index ? 0.8 : 0.9);
        makeBench(x * 0.77 + 20, z + 30.5, Math.PI / 2);
      });
      [[-5.4, -4], [5.4, -4], [-5.4, 4], [5.4, 4]].forEach(([x, z]) => {
        makeMesh(new THREE.CylinderGeometry(0.7, 0.8, 0.28, 10), materials.leaf, courtyard, [x, 0.2, z], false);
        for (let index = 0; index < 5; index += 1) {
          const angle = index * Math.PI * 2 / 5;
          makeMesh(new THREE.SphereGeometry(0.16, 6, 5), index % 2 ? materials.purple : materials.gold, courtyard, [x + Math.cos(angle) * 0.4, 0.42, z + Math.sin(angle) * 0.4], false);
        }
      });
      const lightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-5, 4.4, -4.5),
        new THREE.Vector3(-2.5, 3.5, -5.6),
        new THREE.Vector3(0, 3.2, -5.8),
        new THREE.Vector3(2.5, 3.5, -5.6),
        new THREE.Vector3(5, 4.4, -4.5),
      ]);
      makeMesh(new THREE.TubeGeometry(lightCurve, 20, 0.045, 5, false), materials.banner, courtyard, [0, 0, 0], false);
      for (let index = 0; index <= 6; index += 1) {
        const point = lightCurve.getPoint(index / 6);
        makeMesh(new THREE.SphereGeometry(0.13, 7, 5), materials.lamp, courtyard, point.toArray(), false);
      }
    };
    [[-43, -25], [-30, -50], [10, -50], [33, -35], [-54, 13], [5, 13], [31, 15], [51, 13], [14, 53], [-13, 54]].forEach(([x, z]) => makeFlowerBed(x, z));
    makeMesh(new THREE.TorusGeometry(4.2, 0.1, 6, 40), materials.gold, ground, [0, 0.39, 0], false).rotation.x = -Math.PI / 2;
    [[-10, 0, Math.PI / 2], [10, 0, -Math.PI / 2], [0, -10, 0]].forEach(([x, z, rotation]) => makeBench(x, z, rotation));
    [[-10.2, -5.4], [10.2, -5.4], [-10.2, 5.4], [10.2, 5.4]].forEach(([x, z]) => makeFlowerBed(x, z, 1.45));

    const makeSportsGround = (parent) => {
      const area = new THREE.Group();
      area.position.y = 0.05;
      parent.add(area);
      const fieldCenterX = -2.1;
      makeMesh(new THREE.CylinderGeometry(12.2, 12.5, 0.28, 40), materials.pathEdge, area, [0, 0.11, 0], false).scale.z = 0.8;
      const track = makeMesh(new THREE.RingGeometry(7.2, 8.7, 56), materials.sportsTrack, area, [fieldCenterX, 0.25, 0], false);
      track.rotation.x = -Math.PI / 2;
      track.scale.z = 0.72;
      [7.62, 8.13, 8.64].forEach((radius) => {
        const lane = makeMesh(new THREE.RingGeometry(radius, radius + 0.045, 56), materials.chalk, area, [fieldCenterX, 0.28, 0], false);
        lane.rotation.x = -Math.PI / 2;
        lane.scale.z = 0.72;
      });
      const field = makeMesh(new THREE.CircleGeometry(7.05, 48), materials.sportsField, area, [fieldCenterX, 0.25, 0], false);
      field.rotation.x = -Math.PI / 2;
      field.scale.set(1, 0.72, 1);
      const innerGrass = makeMesh(new THREE.CircleGeometry(6.5, 40), materials.sportsFieldAlt, area, [fieldCenterX - 0.2, 0.265, 0], false);
      innerGrass.rotation.x = -Math.PI / 2;
      innerGrass.scale.y = 0.72;
      box(area, materials.chalk, fieldCenterX, 0.31, 0, 13.2, 0.055, 8.8);
      box(area, materials.chalk, fieldCenterX, 0.33, 0, 0.09, 0.06, 8.7);
      const circle = makeMesh(new THREE.RingGeometry(1.7, 1.78, 32), materials.chalk, area, [fieldCenterX, 0.34, 0], false);
      circle.rotation.x = -Math.PI / 2;
      circle.scale.z = 0.72;
      [-1, 1].forEach((side) => {
        box(area, materials.chalk, fieldCenterX + side * 5.3, 0.33, 0, 2.6, 0.055, 5.1);
        box(area, materials.chalk, fieldCenterX + side * 5.3, 0.34, -2.55, 0.07, 0.06, 5.1);
        box(area, materials.chalk, fieldCenterX + side * 5.3, 0.34, 2.55, 0.07, 0.06, 5.1);
        const goal = new THREE.Group();
        goal.position.set(fieldCenterX + side * 6.72, 0.35, 0);
        area.add(goal);
        box(goal, materials.chalk, 0, 1.25, -1.35, 0.12, 2.5, 0.12);
        box(goal, materials.chalk, 0, 1.25, 1.35, 0.12, 2.5, 0.12);
        box(goal, materials.chalk, 0, 2.5, 0, 0.12, 0.12, 2.8);
      });
      box(area, materials.stoneLight, fieldCenterX, 0.37, 0, 0.52, 0.12, 2.1);
      [-0.72, 0, 0.72].forEach((x) => cylinder(area, materials.wood, fieldCenterX + x, 0.58, 0, 0.055, 0.055, 0.48, 6));
      const pitchCircle = makeMesh(new THREE.RingGeometry(1.05, 1.13, 28), materials.gold, area, [fieldCenterX, 0.39, 0], false);
      pitchCircle.rotation.x = -Math.PI / 2;
      pitchCircle.scale.z = 0.72;

      const sportCourts = [
        { x: 9.5, z: -2.65, material: materials.courtBlue, type: "basketball" },
        { x: 9.5, z: 2.65, material: materials.courtPurple, type: "volleyball" },
      ];
      sportCourts.forEach(({ x, z, material, type }) => {
        box(area, materials.foundation, x, 0.27, z, 5.9, 0.2, 4.8);
        box(area, material, x, 0.39, z, 5.55, 0.055, 4.45);
        box(area, materials.chalk, x, 0.43, z, 5.2, 0.05, 4.1);
        [-1, 1].forEach((side) => box(area, materials.chalk, x + side * 2.58, 0.44, z, 0.06, 0.06, 4.05));
        [-1, 1].forEach((side) => box(area, materials.chalk, x, 0.44, z + side * 2.03, 5.15, 0.06, 0.06));
        if (type === "basketball") {
          [-1, 1].forEach((side) => {
            box(area, materials.wallLight, x + side * 2.72, 1.2, z, 0.13, 1.7, 0.13);
            box(area, materials.chalk, x + side * 2.62, 2, z, 0.14, 1.1, 1.2);
            const hoop = makeMesh(new THREE.TorusGeometry(0.35, 0.055, 6, 14), materials.gold, area, [x + side * 2.32, 1.62, z], false);
            hoop.rotation.y = Math.PI / 2;
          });
          box(area, materials.chalk, x, 0.45, z, 0.06, 0.05, 4.05);
          const centerMark = makeMesh(new THREE.RingGeometry(0.55, 0.62, 24), materials.chalk, area, [x, 0.46, z], false);
          centerMark.rotation.x = -Math.PI / 2;
        } else {
          box(area, materials.wallLight, x, 0.95, z, 0.1, 1, 0.1);
          box(area, materials.wallLight, x, 0.95, z, 5.1, 0.08, 0.08);
          box(area, materials.blue, x, 0.99, z, 5.1, 0.04, 0.08);
        }
      });
      box(area, materials.foundation, 9.5, 0.27, 8.05, 5.9, 0.2, 4.2);
      box(area, materials.juice, 9.5, 0.39, 8.05, 5.55, 0.055, 3.85);
      box(area, materials.chalk, 9.5, 0.43, 8.05, 5.2, 0.05, 3.55);
      [-1, 1].forEach((side) => box(area, materials.chalk, 9.5 + side * 2.58, 0.44, 8.05, 0.06, 0.06, 3.5));
      [-1, 1].forEach((side) => box(area, materials.chalk, 9.5, 0.44, 8.05 + side * 1.73, 5.15, 0.06, 0.06));
      [-1, 1].forEach((side) => cylinder(area, materials.steel, 9.5, 1.05, 8.05 + side * 1.78, 0.045, 0.05, 1.2, 6));
      box(area, materials.wallLight, 9.5, 1.57, 8.05, 5.1, 0.06, 0.05);
      const badmintonLabel = addTextSprite("BADMINTON", 320);
      badmintonLabel.position.set(9.5, 2.15, 10.1);
      badmintonLabel.scale.set(2.2, 0.48, 1);
      area.add(badmintonLabel);

      const bleachers = new THREE.Group();
      bleachers.position.set(fieldCenterX, 0.25, -8.1);
      area.add(bleachers);
      for (let row = 0; row < 4; row += 1) {
        box(bleachers, row % 2 ? materials.roofLight : materials.roof, 0, 0.45 + row * 0.48, row * -0.55, 7.5, 0.35, 0.62);
        box(bleachers, materials.gold, 0, 0.65 + row * 0.48, row * -0.55 + 0.3, 7.5, 0.08, 0.06);
      }
      [-3, 3].forEach((x) => box(bleachers, materials.foundation, x, 0.4, 0.3, 0.22, 0.8, 0.8));

      [-10.8, 10.8].forEach((x) => {
        [-6.8, 6.8].forEach((z) => {
          cylinder(area, materials.roof, x, 3.8, z, 0.16, 0.2, 7.6, 8);
          box(area, materials.paleGold, x, 7.55, z, 1.25, 0.34, 0.5);
          [-0.38, 0, 0.38].forEach((offset) => makeMesh(
            new THREE.SphereGeometry(0.17, 7, 5),
            materials.lamp,
            area,
            [x + offset, 7.5, z],
            false,
          ));
        });
      });
      const floodlight = new THREE.PointLight("#f4c95d", 1.3, 21, 2);
      floodlight.position.set(-10.8, 7.8, -6.8);
      area.add(floodlight);
      const floodlight2 = new THREE.PointLight("#f4c95d", 1.3, 21, 2);
      floodlight2.position.set(10.8, 7.8, 6.8);
      area.add(floodlight2);

      [-10.2, 8.9].forEach((z) => {
        for (let index = -3; index <= 3; index += 1) {
          cylinder(area, materials.blue, index * 3.2, 0.72, z, 0.055, 0.065, 1.45, 6);
        }
        box(area, materials.blue, 0, 1.36, z, 20, 0.08, 0.08);
      });
      box(area, materials.banner, -10.7, 2.95, 0, 0.45, 0.95, 3.6);
      box(area, materials.gold, -10.44, 2.95, 0, 0.08, 0.76, 3.2);
      const sportsSign = addTextSprite("SPORTS COMPLEX");
      sportsSign.position.set(-10.38, 3.02, 0);
      sportsSign.scale.set(4.2, 1.05, 1);
      [-1, 1].forEach((side) => {
        cylinder(area, materials.stoneLight, -12, 1.65, side * 1.6, 0.22, 0.26, 3.3, 8);
      });
      box(area, materials.roof, -12, 3.35, 0, 0.45, 0.5, 3.6);
      box(area, materials.path, -10.5, 0.23, 0, 3.8, 0.12, 2.8);

      const equipment = new THREE.Group();
      equipment.position.set(-1, 0.3, 10.2);
      area.add(equipment);
      box(equipment, materials.wood, 0, 0.8, 0, 2.5, 1.6, 1.9);
      box(equipment, materials.gold, 0, 1.68, 0, 2.7, 0.16, 2.1);
      [-0.6, 0, 0.6].forEach((offset) => makeMesh(new THREE.SphereGeometry(0.22, 8, 6), materials.orange, equipment, [offset, 2, 0], false));

    };

    const makeGarden = () => {
      const garden = new THREE.Group();
      garden.position.set(40, 0.18, 24);
      ground.add(garden);
      const bed = makeMesh(new THREE.CylinderGeometry(7.2, 8.1, 0.2, 32), makeMaterial("#334c3a"), garden, [0, 0, 0], false);
      bed.scale.z = 0.72;
      const meander = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6, 0.2, 1), new THREE.Vector3(-3.5, 0.25, -2.2),
        new THREE.Vector3(0.5, 0.25, 1), new THREE.Vector3(3.2, 0.25, -1.7),
        new THREE.Vector3(6, 0.25, 0),
      ]);
      makeMesh(new THREE.TubeGeometry(meander, 40, 0.55, 7, false), materials.path, garden, [0, 0, 0], false);
      cylinder(garden, materials.stoneLight, 0, 0.55, 0, 1.25, 1.55, 0.55, 12);
      cylinder(garden, materials.water, 0, 0.87, 0, 1.15, 1.18, 0.12, 16);
      const gardenGlow = new THREE.PointLight("#a578d2", 1.5, 12, 2);
      gardenGlow.position.set(0, 3.4, 0);
      garden.add(gardenGlow);
      [[-5, -3], [-4, 4], [4.8, -3.5], [5.2, 3], [-1, -5], [2, 5]].forEach(([x, z], index) => makeTreeIn(garden, x, z, index % 2 ? 0.7 : 0.85));
      [[-3.2, -0.8], [-2.4, 1.8], [-0.8, -2.9], [1.4, 2.6], [3.4, -0.5], [4, 1.2], [-4.1, 1.5], [0.2, 4.1]].forEach(([x, z], index) => {
        makeMesh(new THREE.SphereGeometry(0.2, 6, 5), index % 3 ? materials.purple : materials.gold, garden, [x, 0.48, z], false);
      });
      makeBench(37, 27, Math.PI / 2);
    };
    function makeTreeIn(parent, x, z, scale = 1) {
      const tree = new THREE.Group();
      tree.position.set(x, 0.15, z);
      tree.scale.setScalar(scale);
      parent.add(tree);
      cylinder(tree, materials.wood, 0, 0.9, 0, 0.24, 0.33, 1.8, 6);
      cone(tree, materials.leaf, 0, 2.45, 0, 1.35, 2.45, 7);
      cone(tree, materials.leafLight, 0, 3.5, 0, 0.9, 1.8, 7);
    }
    makeGarden();
    makeSocialCourtyard();

    const addTextSprite = (text, size = 512) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = Math.max(64, Math.round(size / 4));
      const context = canvas.getContext("2d");
      context.fillStyle = "rgba(20, 20, 36, 0.88)";
      context.beginPath();
      const inset = size * 0.012;
      if (context.roundRect) context.roundRect(inset, inset, size - inset * 2, canvas.height - inset * 2, canvas.height * 0.2);
      else context.rect(inset, inset, size - inset * 2, canvas.height - inset * 2);
      context.fill();
      context.strokeStyle = "rgba(238, 202, 133, 0.62)";
      context.lineWidth = Math.max(2, size / 256);
      context.stroke();
      context.font = `700 ${Math.max(18, Math.round(size * 0.085))}px Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#fff0cb";
      context.fillText(text, size / 2, canvas.height / 2, size - inset * 4);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.encoding = THREE.sRGBEncoding;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
      sprite.scale.set(size === 512 ? 8.4 : 1.4, size === 512 ? 2.1 : 1.1, 1);
      return sprite;
    };

    const makeParkingArea = () => {
      const parking = new THREE.Group();
      parking.position.set(-22, 0.03, 56);
      decorationLayer.add(parking);
      box(parking, materials.pathEdge, 0, 0.08, 0, 21, 0.16, 16);
      box(parking, materials.parking, 0, 0.18, 0, 20.4, 0.12, 15.4);
      [-9.6, 9.6].forEach((x) => {
        box(parking, materials.stone, x, 0.48, 0, 0.32, 0.72, 16);
        box(parking, materials.gold, x, 0.88, 0, 0.38, 0.12, 16);
      });
      for (let index = 0; index < 6; index += 1) {
        const x = -8 + index * 3.2;
        [-4.8, 4.8].forEach((z) => {
          box(parking, materials.chalk, x, 0.26, z, 0.08, 0.035, 4.3);
        });
      }
      [-2.7, 2.7].forEach((x) => box(parking, materials.chalk, x, 0.27, 0, 0.07, 0.04, 4.8));
      const arrow = makeMesh(new THREE.ConeGeometry(0.48, 1.25, 3), materials.paleGold, parking, [0, 0.42, -1.2], false);
      arrow.rotation.x = Math.PI / 2;
      const makeVehicle = (x, z, color, scooter = false) => {
        const vehicle = new THREE.Group();
        vehicle.position.set(x, 0.3, z);
        parking.add(vehicle);
        if (scooter) {
          cylinder(vehicle, materials.roof, 0, 0.42, 0, 0.22, 0.24, 0.65, 8);
          box(vehicle, makeMaterial(color, { metalness: 0.12 }), 0, 0.82, 0, 0.34, 0.52, 0.72);
          cylinder(vehicle, materials.roof, 0, 1.35, -0.28, 0.07, 0.08, 0.75, 8);
          box(vehicle, materials.gold, 0, 1.68, -0.26, 0.76, 0.08, 0.08);
          return;
        }
        const paint = makeMaterial(color, { metalness: 0.16, roughness: 0.48 });
        box(vehicle, paint, 0, 0.82, 0, 2.9, 0.72, 1.48);
        box(vehicle, paint, -0.12, 1.38, 0, 1.62, 0.58, 1.2);
        box(vehicle, materials.blueGlass, -0.12, 1.42, 0.63, 1.34, 0.42, 0.06);
        box(vehicle, materials.blueGlass, -0.12, 1.42, -0.63, 1.34, 0.42, 0.06);
        [-0.88, 0.88].forEach((wheelX) => [-0.78, 0.78].forEach((wheelZ) => {
          const wheel = cylinder(vehicle, materials.foundation, wheelX, 0.48, wheelZ, 0.34, 0.34, 0.2, 10);
          wheel.rotation.x = Math.PI / 2;
        }));
        [-1.48, 1.48].forEach((xEnd) => {
          box(vehicle, materials.lamp, xEnd, 0.87, 0.76, 0.18, 0.18, 0.05);
        });
      };
      [
        [-6.3, -5, "#4d81bd"], [-1.7, -5, "#d49c54"], [3.2, -5, "#68589a"],
        [-5.1, 5, "#4d81bd"], [0, 5, "#7c925e"], [5.2, 5, "#b96853"],
      ].forEach(([x, z, color], index) => makeVehicle(x, z, color, index === 2 || index === 5));
      const sign = new THREE.Group();
      sign.position.set(-8.8, 0.2, -6.1);
      parking.add(sign);
      cylinder(sign, materials.roof, 0, 1.35, 0, 0.09, 0.12, 2.7, 8);
      box(sign, materials.banner, 0, 2.35, 0.08, 3.7, 1.05, 0.18);
      box(sign, materials.gold, 0, 2.9, 0.08, 3.8, 0.1, 0.2);
      const signText = addTextSprite("CAMPUS PARKING");
      signText.position.set(0, 2.35, 0.19);
      signText.scale.set(3.35, 0.8, 1);
      sign.add(signText);
      [[-9.2, -6.2], [9.2, -6.2], [-9.2, 6.4], [9.2, 6.4]].forEach(([x, z]) => {
        makeTreeIn(parking, x, z, 0.5);
      });
      makeLamp(-30.5, 56, false);
      makeLamp(-13.5, 56, false);
    };
    const makeCricketNet = () => {
      const cricket = new THREE.Group();
      cricket.position.set(-55, 0.04, -50);
      decorationLayer.add(cricket);
      box(cricket, materials.pathEdge, 0, 0.08, 0, 19, 0.16, 14);
      box(cricket, materials.cricketTurf, 0, 0.19, 0, 18.4, 0.12, 13.4);
      box(cricket, materials.sportsField, 0, 0.28, 0, 4.4, 0.08, 11.4);
      [-2.05, 2.05].forEach((x) => box(cricket, materials.chalk, x, 0.34, 0, 0.07, 0.035, 10.8));
      [-5.4, 5.4].forEach((z) => box(cricket, materials.chalk, 0, 0.34, z, 4.15, 0.035, 0.07));
      const netPosts = [];
      [-2.7, 2.7].forEach((x) => [-6.1, 6.1].forEach((z) => netPosts.push([x, z])));
      netPosts.forEach(([x, z]) => cylinder(cricket, materials.roof, x, 3.15, z, 0.1, 0.13, 6.2, 8));
      [-2.7, 2.7].forEach((x) => box(cricket, materials.roof, x, 6.2, 0, 0.14, 0.14, 12.3));
      [-6.1, 6.1].forEach((z) => box(cricket, materials.roof, 0, 6.2, z, 5.5, 0.14, 0.14));
      const netMaterial = makeMaterial("#64756e", { transparent: true, opacity: 0.44, roughness: 1, side: THREE.DoubleSide });
      [-2.7, 2.7].forEach((x) => {
        for (let index = 0; index <= 12; index += 1) {
          box(cricket, netMaterial, x, 3.1, -6 + index, 0.025, 6, 0.025);
        }
        for (let height = 1; height <= 5; height += 1) box(cricket, netMaterial, x, height, 0, 0.025, 0.025, 12);
      });
      [-6.1, 6.1].forEach((z) => {
        for (let index = 0; index <= 5; index += 1) {
          box(cricket, netMaterial, -2.5 + index, 3.1, z, 0.025, 6, 0.025);
        }
        for (let height = 1; height <= 5; height += 1) box(cricket, netMaterial, 0, height, z, 5.4, 0.025, 0.025);
      });
      [-4.65, 4.65].forEach((z) => {
        [-0.45, 0, 0.45].forEach((x) => cylinder(cricket, materials.wallLight, x, 0.67, z, 0.055, 0.06, 1.2, 6));
        box(cricket, materials.chalk, 0, 0.35, z, 1.55, 0.04, 0.08);
      });
      box(cricket, materials.wood, 5.8, 0.85, -3.2, 2.4, 1.7, 1.4);
      box(cricket, materials.gold, 5.8, 1.75, -3.2, 2.6, 0.14, 1.6);
      [-2.8, 2.8].forEach((x) => {
        box(cricket, materials.roof, x, 0.82, 8.2, 3.2, 0.18, 0.62);
        box(cricket, materials.wood, x, 1.25, 8.02, 3.2, 0.72, 0.16);
      });
      const sign = addTextSprite("CRICKET PRACTICE NET");
      sign.position.set(0, 2.1, 7.35);
      sign.scale.set(6.8, 1.6, 1);
      makeMesh(new THREE.TorusGeometry(7.4, 0.08, 6, 36), materials.leafLight, cricket, [0, 0.31, 0], false).rotation.x = -Math.PI / 2;
    };
    makeParkingArea();
    makeCricketNet();

    const amenityGroups = [];
    const makeAmenity = (id, name, description, x, z, radius, build, href = "", collisionRadius = radius) => {
      const group = new THREE.Group();
      group.name = name;
      group.position.set(x, 0.16, z);
      group.userData.amenity = { id, name, description, href };
      group.userData.collisionRadius = collisionRadius;
      decorationLayer.add(group);
      const plinth = makeMesh(new THREE.CylinderGeometry(radius, radius * 1.04, 0.12, 20), materials.pathEdge, group, [0, 0.08, 0], false);
      plinth.receiveShadow = true;
      makeMesh(new THREE.TorusGeometry(radius * 0.92, 0.055, 5, 24), materials.gold, group, [0, 0.17, 0], false).rotation.x = -Math.PI / 2;
      build(group);
      const label = addTextSprite(name.toUpperCase(), 384);
      label.position.set(0, 4.1, 0);
      label.scale.set(Math.max(2.2, Math.min(5.1, name.length * 0.22)), 0.7, 1);
      group.add(label);
      group.traverse((object) => {
        if (object.isMesh || object.isSprite) object.userData.amenityGroup = group;
      });
      amenityGroups.push(group);
      return group;
    };
    const amenitySign = (parent, text, x, y, z, width, color = materials.banner) => {
      box(parent, color, x, y, z, width, 0.92, 0.16);
      box(parent, materials.gold, x, y + 0.5, z, width + 0.12, 0.09, 0.2);
      const signText = addTextSprite(text, 384);
      signText.position.set(x, y, z + 0.1);
      signText.scale.set(width * 0.88, 0.48, 1);
      parent.add(signText);
    };
    const kioskBody = (parent, color, sign, x = 0, z = 0, width = 3.2) => {
      box(parent, materials.foundation, x, 0.62, z, width + 0.32, 1.24, 2.25);
      box(parent, color, x, 1.3, z, width, 1.25, 2.08);
      box(parent, materials.wood, x, 0.82, z + 1.14, width + 0.3, 0.2, 0.46);
      box(parent, materials.wallLight, x, 1.17, z + 1.23, width + 0.52, 0.14, 0.52);
      box(parent, color, x, 2.12, z, width + 0.72, 0.28, 2.45);
      amenitySign(parent, sign, x, 2.48, z + 1.25, width + 0.38, color);
    };
    const umbrellaTable = (parent, x, z, color, scale = 1) => {
      cylinder(parent, materials.wood, x, 0.82, z, 0.74 * scale, 0.8 * scale, 0.2, 10);
      cylinder(parent, materials.wood, x, 0.42, z, 0.12 * scale, 0.15 * scale, 0.78, 8);
      [-1, 1].forEach((side) => {
        box(parent, materials.wood, x + side * 1.05 * scale, 0.5, z, 0.14, 0.82, 0.14);
        box(parent, materials.wood, x + side * 1.05 * scale, 0.94, z, 0.78, 0.14, 0.4);
      });
      cylinder(parent, materials.roof, x, 2.35, z, 0.08, 0.1, 2.65, 8);
      cone(parent, color, x, 3.45, z, 1.38 * scale, 0.55, 9);
      makeMesh(new THREE.SphereGeometry(0.14, 7, 5), materials.lamp, parent, [x, 3.08, z], false);
    };
    makeAmenity("nescafe", "Nescafé", "Grab a coffee and take a break. Student hangout · +5 Energy", 10, 36.5, 3.25, (group) => {
      kioskBody(group, materials.cafeRed, "NESCAFÉ", 0, -0.8, 3.5);
      box(group, materials.paper, 2.12, 2.1, 0.1, 0.72, 0.82, 0.12);
      box(group, materials.wood, 0, 0.78, 0.52, 3.95, 0.2, 0.46);
      [-1.4, 1.4].forEach((x) => cylinder(group, materials.gold, x, 0.98, 0.55, 0.12, 0.12, 0.12, 8));
      umbrellaTable(group, -2.65, 2.5, materials.orange, 0.78);
      umbrellaTable(group, 2.65, 2.5, materials.cafeRed, 0.78);
      makeLamp(10, 39.2, false);
    });

    makeAmenity("food-street", "Food Street", "A lively little lane for snacks, fresh juice, fast food and ice cream.", 30, 32, 7.2, (group) => {
      const stalls = [
        { x: -5.5, color: materials.orange, sign: "SNACKS" },
        { x: -1.85, color: materials.juice, sign: "JUICE & SHAKES" },
        { x: 1.85, color: materials.cafeRed, sign: "FAST FOOD" },
        { x: 5.5, color: materials.iceCream, sign: "ICE CREAM" },
      ];
      stalls.forEach(({ x, color, sign }, index) => {
        kioskBody(group, color, sign, x, -1.35, 2.65);
        umbrellaTable(group, x, 2.2, index % 2 ? materials.gold : color, 0.62);
        makeMesh(new THREE.SphereGeometry(0.18, 7, 5), index === 1 ? materials.green : materials.orange, group, [x, 1.95, -0.15], false);
      });
      const lightString = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7, 4.15, -2), new THREE.Vector3(-3, 3.65, -2.5),
        new THREE.Vector3(1, 3.55, -2.5), new THREE.Vector3(5, 3.85, -2),
      ]);
      makeMesh(new THREE.TubeGeometry(lightString, 16, 0.035, 5, false), materials.banner, group, [0, 0, 0], false);
      for (let index = 0; index <= 6; index += 1) {
        const bulb = lightString.getPoint(index / 6);
        makeMesh(new THREE.SphereGeometry(0.12, 6, 5), materials.lamp, group, bulb.toArray(), false);
      }
    }, "", 2.4);

    const makeCampusShop = (id, name, description, x, z, type) => makeAmenity(id, name, description, x, z, type === "bookstore" ? 2.15 : 1.8, (group) => {
      const accent = type === "bookstore" ? materials.roofPurple : materials.blue;
      box(group, materials.foundation, 0, 0.68, 0, 4.5, 1.36, 3.2);
      box(group, materials.wallLight, 0, 1.34, 0, 4.2, 1.22, 2.9);
      box(group, accent, 0, 2.12, 0, 4.65, 0.3, 3.3);
      amenitySign(group, name.toUpperCase(), 0, 2.62, 1.58, 4.15, accent);
      if (type === "bookstore") {
        [-1.35, 0, 1.35].forEach((xShelf, index) => {
          box(group, materials.wood, xShelf, 1.15, -0.62, 0.92, 1.65, 0.32);
          for (let book = 0; book < 4; book += 1) {
            box(group, [materials.purple, materials.blue, materials.gold, materials.orange][(book + index) % 4], xShelf - 0.32 + book * 0.21, 1.29, -0.4, 0.14, 0.82, 0.12);
          }
        });
        box(group, materials.wood, 0, 0.74, 1.12, 2.3, 0.15, 0.55);
        makeBench(x + 3, z + 0.8, Math.PI / 2);
      } else if (type === "print") {
        box(group, materials.steel, -0.7, 1.05, -0.45, 1.25, 0.95, 1.1);
        box(group, materials.paper, -0.7, 1.48, 0.13, 0.82, 0.08, 0.22);
        box(group, materials.blue, -0.7, 1.18, 0.15, 0.3, 0.18, 0.05);
        box(group, materials.wood, 1.15, 1.06, 0.6, 1.25, 0.2, 1.5);
      } else {
        [-1.3, 0, 1.3].forEach((xShelf, index) => {
          box(group, materials.wood, xShelf, 1.18, -0.62, 0.88, 1.65, 0.28);
          for (let book = 0; book < 3; book += 1) {
            box(group, [materials.purple, materials.blue, materials.gold][(book + index) % 3], xShelf - 0.24 + book * 0.22, 1.33, -0.43, 0.15, 0.62, 0.12);
          }
        });
        box(group, materials.paper, 0, 0.89, 0.8, 0.8, 0.07, 0.5);
      }
    }, "", type === "bookstore" ? 2.15 : 1.25);
    makeCampusShop("campus-stationery", "Campus Stationery", "Books, notebooks and the little things that keep a semester moving.", -53, -5, "stationery");
    makeCampusShop("print-copy", "Print & Copy", "A quick stop for printing, copying and project hand-ins.", -58, -11, "print");
    makeCampusShop("bookstore", "Campus Bookstore", "Browse campus reads, course books and a quiet place to pause.", -13, -43, "bookstore");

    makeAmenity("shuttle-stop", "Campus Shuttle", "Wait here for the campus shuttle. The route board points toward the Main Gate.", 8, 55, 2.15, (group) => {
      [-1.65, 1.65].forEach((x) => {
        box(group, materials.steel, x, 1.65, 0, 0.13, 3.3, 0.13);
        box(group, materials.roof, x, 3.27, 0, 0.18, 0.15, 3.1);
      });
      box(group, materials.roof, 0, 3.15, 0, 3.45, 0.28, 3.15);
      box(group, materials.blueGlass, 0, 1.85, -1.35, 3.2, 2.35, 0.08);
      box(group, materials.wood, 0, 0.75, 0.6, 2.6, 0.18, 0.62);
      amenitySign(group, "ROUTE BOARD", 1.05, 2.08, 1.55, 1.55, materials.blue);
      makeLamp(8, 52.1, false);
    });

    makeAmenity("information-kiosk", "Campus Info", "Explore CampusQuest and discover locations, quests and activities.", 14, 44, 1.65, (group) => {
      box(group, materials.foundation, 0, 0.85, 0, 2.7, 1.7, 1.35);
      box(group, materials.steel, 0, 1.5, 0.15, 2.35, 1.55, 0.24);
      box(group, materials.blueGlass, 0, 1.62, 0.31, 1.85, 1.05, 0.06);
      box(group, materials.roofPurple, 0, 2.42, 0, 3.1, 0.2, 1.9);
      box(group, materials.gold, 0, 2.57, 0, 3.2, 0.07, 2);
      amenitySign(group, "CAMPUS INFO", 0, 1.62, 0.38, 2.1, materials.purple);
      const beacon = new THREE.PointLight("#8b6de0", 0.75, 6, 2);
      beacon.position.set(0, 2.8, 0);
      group.add(beacon);
    });

    makeAmenity("atm", "ATM", "A small campus banking stop. No real transactions take place here.", 16, 10, 1.35, (group) => {
      box(group, materials.roofPurple, 0, 1.38, 0, 1.9, 2.75, 1.05);
      box(group, materials.blueGlass, 0, 1.92, 0.55, 1.15, 0.8, 0.08);
      box(group, materials.steel, 0, 0.87, 0.58, 0.8, 0.14, 0.08);
      box(group, materials.gold, 0, 2.68, 0.55, 1.6, 0.18, 0.08);
      const shelter = box(group, materials.roof, 0, 3.08, 0, 2.6, 0.18, 1.75);
    });

    const makeWaterStation = (id, label, x, z, radius = 1.25) => makeAmenity(id, label, "Pause for a drink at this shaded campus water station.", x, z, radius, (group) => {
      [-1, 1].forEach((side) => box(group, materials.wood, side * 0.82, 1.25, 0, 0.12, 2.5, 0.12));
      box(group, materials.roof, 0, 2.55, 0, 2.05, 0.2, 1.75);
      box(group, materials.blue, 0, 1.05, 0, 1.15, 1.25, 0.92);
      box(group, materials.steel, 0, 1.74, 0.5, 1.22, 0.17, 0.12);
      box(group, materials.water, 0, 1.22, 0.49, 0.6, 0.34, 0.08);
      box(group, materials.paper, 0, 2.12, 0.49, 1.38, 0.28, 0.06);
      const sign = addTextSprite("DRINKING WATER", 320);
      sign.position.set(0, 2.12, 0.54);
      sign.scale.set(1.22, 0.3, 1);
      group.add(sign);
    });
    makeWaterStation("water-hub", "Water Station · Student Hub", -8, 39);
    makeWaterStation("water-academic", "Water Station · Academic District", -48, -17);
    makeWaterStation("water-sports", "Water Station · Sports Complex", 45, 49, 1.35);

    const makeVendingMachine = (id, label, x, z, color) => makeAmenity(id, label, "A quick snack or drink from the campus vending machine.", x, z, 0.85, (group) => {
      box(group, materials.foundation, 0, 1.2, 0, 1.35, 2.4, 0.9);
      box(group, color, 0, 1.32, 0.48, 1.16, 2.08, 0.08);
      box(group, materials.blueGlass, -0.2, 1.48, 0.55, 0.62, 1.24, 0.06);
      [0, 1, 2, 3].forEach((row) => [-0.38, -0.08, 0.22].forEach((col) => {
        box(group, [materials.orange, materials.gold, materials.juice, materials.iceCream][(row + col + 5) % 4], col, 1.1 + row * 0.23, 0.6, 0.18, 0.12, 0.1);
      }));
      box(group, materials.steel, 0.43, 0.65, 0.56, 0.22, 0.38, 0.07);
    });
    makeVendingMachine("vending-library", "Library Vending", -38, -42, materials.roofPurple);
    makeVendingMachine("vending-lab", "Innovation Lab Vending", 48, -30, materials.blue);
    makeVendingMachine("vending-sports", "Sports Vending", 72, 49, materials.green);

    makeAmenity("charge-study", "Charge & Study", "A shaded student corner with charging tables, benches and laptop-friendly seats.", 10, 18, 3.45, (group) => {
      [-2.3, 2.3].forEach((x) => {
        box(group, materials.roof, x, 3.15, 0, 0.14, 0.18, 5.3);
        box(group, materials.roof, x / 2, 3.25, 0, 2.6, 0.18, 5.3);
      });
      [-1.2, 1.2].forEach((z) => {
        box(group, materials.wood, 0, 1.05, z, 3.8, 0.18, 0.9);
        [-1.4, 1.4].forEach((x) => box(group, materials.steel, x, 1.19, z - 0.1, 0.18, 0.08, 0.22));
        [-1.7, 1.7].forEach((x) => box(group, materials.wood, x, 0.54, z + 0.72, 0.9, 0.14, 0.42));
        box(group, materials.blueGlass, 0, 1.19, z, 0.48, 0.06, 0.35);
      });
      amenitySign(group, "CHARGE & STUDY", 0, 2.58, 2.35, 3.8, materials.roofPurple);
    });

    const makeNoticeBoard = (id, label, x, z, rotation = 0) => makeAmenity(id, label, "Campus notices: workshops, hackathons, sports events, clubs and quests.", x, z, 1.15, (group) => {
      group.rotation.y = rotation;
      [-0.85, 0.85].forEach((side) => box(group, materials.wood, side, 1.25, 0, 0.13, 2.5, 0.15));
      box(group, materials.wood, 0, 2.36, 0, 2, 0.2, 0.2);
      box(group, materials.banner, 0, 1.3, 0.1, 1.82, 1.9, 0.18);
      [materials.gold, materials.purple, materials.blue].forEach((color, index) => {
        box(group, color, -0.52 + index * 0.52, 1.4 + (index % 2) * 0.15, 0.22, 0.38, 0.72, 0.06);
        box(group, materials.paper, -0.52 + index * 0.52, 1.77 + (index % 2) * 0.15, 0.25, 0.28, 0.05, 0.04);
      });
      const header = addTextSprite("CAMPUS LIFE", 320);
      header.position.set(0, 2.08, 0.24);
      header.scale.set(1.55, 0.32, 1);
      group.add(header);
    });
    makeNoticeBoard("notice-gate", "Main Gate Notice Board", -10, 49, Math.PI / 5);
    makeNoticeBoard("notice-hub", "Student Hub Notice Board", -10, 31, Math.PI / 3);
    makeNoticeBoard("notice-academic", "Academic Hall Notice Board", -49, 1, -Math.PI / 5);
    makeNoticeBoard("notice-library", "Library Notice Board", -12, -29, Math.PI / 4);
    makeNoticeBoard("notice-sports", "Sports Events Board", 47, 43, Math.PI / 3);

    makeAmenity("quest-board", "Quest Board", "Pick up a new challenge and see what is happening around campus.", 10, 30, 1.5, (group) => {
      box(group, materials.wood, 0, 1.35, 0, 2.65, 2.7, 0.28);
      box(group, materials.banner, 0, 1.45, 0.18, 2.34, 1.72, 0.08);
      [-0.7, 0, 0.7].forEach((x, index) => box(group, [materials.gold, materials.purple, materials.blue][index], x, 1.38, 0.24, 0.46, 1.12, 0.05));
      amenitySign(group, "QUEST BOARD", 0, 2.65, 0.22, 2.45, materials.purple);
      box(group, materials.wood, 0, 0.65, -0.08, 2.7, 0.18, 0.48);
    }, "/quests");

    makeAmenity("reward-shop", "Reward Shop", "Exchange your CampusQuest coins for exclusive rewards.", 20, 15, 1.8, (group) => {
      kioskBody(group, materials.roofPurple, "REWARD SHOP", 0, -0.2, 3.3);
      box(group, materials.blueGlass, 0, 1.25, 0.99, 2.75, 0.38, 0.08);
      [-0.9, 0, 0.9].forEach((x, index) => {
        box(group, index === 1 ? materials.gold : materials.purple, x, 1.73, 1.04, 0.42, 0.44, 0.16);
        makeMesh(new THREE.OctahedronGeometry(0.26, 0), index === 1 ? materials.gold : materials.purple, group, [x, 2.1, 1.04], false);
      });
      const glow = new THREE.PointLight("#9c7aff", 0.65, 7, 2);
      glow.position.set(0, 3.5, 0.5);
      group.add(glow);
    }, "/rewards");

    makeAmenity("achievement-wall", "Achievement Wall", "A display of campus milestones: Quest Master, Code Warrior, Campus Explorer and Mini Game Champion.", -10, 36, 2.25, (group) => {
      box(group, materials.foundation, 0, 1.75, 0, 5.1, 3.5, 0.52);
      box(group, materials.roofPurple, 0, 1.75, 0.3, 4.7, 3.1, 0.12);
      ["QUEST MASTER", "CODE WARRIOR", "CAMPUS EXPLORER", "MINI GAME CHAMPION"].forEach((title, index) => {
        const x = -1.65 + (index % 2) * 3.3;
        const y = 2.45 - Math.floor(index / 2) * 1.4;
        makeMesh(new THREE.OctahedronGeometry(0.42, 0), index % 2 ? materials.purple : materials.gold, group, [x, y, 0.44], false);
        const badge = addTextSprite(title, 320);
        badge.position.set(x, y - 0.55, 0.46);
        badge.scale.set(2.1, 0.32, 1);
        group.add(badge);
      });
      amenitySign(group, "ACHIEVEMENTS", 0, 3.8, 0.3, 3.2, materials.roofPurple);
    }, "/achievements");

    makeAmenity("photo-spot", "CampusQuest Photo Spot", "Your campus. Your quest. A little spot to mark the moment.", 0, 13, 2.3, (group) => {
      box(group, materials.roofPurple, 0, 2.25, 0, 5.2, 4.5, 0.35);
      box(group, materials.gold, 0, 2.25, 0.2, 4.65, 3.95, 0.15);
      box(group, materials.foundation, 0, 2.25, 0.31, 3.95, 3.28, 0.12);
      const photoTitle = addTextSprite("CAMPUSQUEST", 384);
      photoTitle.position.set(0, 3.72, 0.43);
      photoTitle.scale.set(3.6, 0.75, 1);
      group.add(photoTitle);
      const tagline = addTextSprite("YOUR CAMPUS. YOUR QUEST.", 384);
      tagline.position.set(0, 1.18, 0.43);
      tagline.scale.set(3.3, 0.64, 1);
      group.add(tagline);
      [-1, 1].forEach((side) => makeMesh(new THREE.OctahedronGeometry(0.42, 0), materials.gold, group, [side * 3.1, 3.7, 0.35], false));
      const photoGlow = new THREE.PointLight("#916ce2", 0.75, 8, 2);
      photoGlow.position.set(0, 3.6, 1);
      group.add(photoGlow);
    });

    makeAmenity("sports-shed", "Sports Equipment Shed", "Collect a ball, racket or net before heading out to play.", 45, 55, 1.8, (group) => {
      box(group, materials.foundation, 0, 0.7, 0, 3.8, 1.4, 3.25);
      box(group, materials.wall, 0, 1.38, 0, 3.55, 1.25, 3);
      box(group, materials.roof, 0, 2.2, 0, 4.05, 0.32, 3.5);
      box(group, materials.wood, 0, 0.95, 1.53, 1.5, 1.7, 0.12);
      [-1.15, 0, 1.15].forEach((x, index) => makeMesh(new THREE.SphereGeometry(0.38, 8, 6), [materials.orange, materials.gold, materials.blue][index], group, [x, 0.72, 1.8], false));
      amenitySign(group, "SPORTS GEAR", 0, 2.6, 1.52, 2.9, materials.blue);
    });

    const makeBanner = (x, z, message, rotation = 0) => {
      const banner = new THREE.Group();
      banner.position.set(x, 0.15, z);
      banner.rotation.y = rotation;
      decorationLayer.add(banner);
      cylinder(banner, materials.roof, 0, 2.1, 0, 0.08, 0.11, 4.2, 8);
      box(banner, materials.banner, 0.57, 2.9, 0, 1.12, 1.75, 0.12);
      box(banner, materials.gold, 0.57, 3.78, 0, 1.18, 0.1, 0.16);
      box(banner, materials.purple, 0.57, 2.14, 0, 1.18, 0.12, 0.16);
      const label = addTextSprite(message);
      label.position.set(0.57, 2.95, 0.09);
      label.scale.set(1.05, 0.42, 1);
      banner.add(label);
    };
    [
      [-50, -3, "LEARN", -0.3],
      [29, -35, "CREATE", 0.3],
      [15, -8, "EXPLORE", 0],
      [-48, 18, "CREATE", -0.4],
      [53, 39, "COMPETE", 0.4],
    ].forEach(([x, z, label, rotation]) => makeBanner(x, z, label, rotation));
    [[-13, 19], [12, 19], [-13, 2], [12, 2], [-39, -26], [-45, 3], [32, -32], [46, 10], [52, 39]].forEach(([x, z]) => makeLamp(x, z, false));
    [[-5.2, 64.5], [5.2, 64.5]].forEach(([x, z]) => makeLamp(x, z, false));
    const makeBikeRack = (x, z, rotation = 0) => {
      const rack = new THREE.Group();
      rack.position.set(x, 0.15, z);
      rack.rotation.y = rotation;
      decorationLayer.add(rack);
      cylinder(rack, materials.stone, 0, 0.13, 0, 0.1, 0.12, 0.26, 8);
      for (let index = 0; index < 3; index += 1) {
        const loop = makeMesh(new THREE.TorusGeometry(0.42, 0.07, 6, 14, Math.PI), materials.roofLight, rack, [index * 0.75 - 0.75, 0.68, 0], false);
        loop.rotation.z = Math.PI;
      }
    };
    makeBikeRack(-13, 19, Math.PI / 2);
    makeBikeRack(26, 42, 0);
    const makeRecycleBins = (x, z) => {
      [materials.blue, materials.green].forEach((material, index) => {
        const bin = new THREE.Group();
        bin.position.set(x + index * 0.72, 0.16, z);
        decorationLayer.add(bin);
        cylinder(bin, material, 0, 0.54, 0, 0.32, 0.38, 0.9, 8);
        cylinder(bin, materials.roof, 0, 1.02, 0, 0.36, 0.36, 0.12, 8);
        box(bin, materials.wallLight, 0, 0.6, 0.34, 0.28, 0.08, 0.04);
      });
    };
    makeRecycleBins(7, 16);
    makeRecycleBins(-48, 14);

    const addWindows = (group, width, zFront, y, count = 3, wallMaterial = materials.wallLight, windowMaterial = materials.window) => {
      const spacing = width / (count + 1);
      for (let index = 1; index <= count; index += 1) {
        box(group, wallMaterial, -width / 2 + spacing * index, y, zFront + 0.04, 0.92, 1.2, 0.12);
        box(group, windowMaterial, -width / 2 + spacing * index, y, zFront + 0.11, 0.64, 0.86, 0.035);
        box(group, materials.wood, -width / 2 + spacing * index, y, zFront + 0.14, 0.07, 0.88, 0.035);
        box(group, materials.wood, -width / 2 + spacing * index, y, zFront + 0.145, 0.68, 0.07, 0.035);
      }
    };
    const addBuildingBody = (group, {
      width = 10,
      depth = 7,
      height = 5.2,
      wall = materials.wall,
      roof = materials.roof,
      floors = 1,
      windows = materials.window,
    } = {}) => {
      box(group, materials.foundation, 0, 0.35, 0, width + 1.4, 0.7, depth + 1.4);
      for (let floor = 0; floor < floors; floor += 1) {
        const floorY = 0.7 + floor * (height / floors);
        const floorHeight = height / floors;
        box(group, wall, 0, floorY + floorHeight / 2, 0, width, floorHeight, depth);
        box(group, materials.stoneLight, 0, floorY + floorHeight, 0, width + 0.28, 0.18, depth + 0.28);
        addWindows(group, width - 1, depth / 2, floorY + floorHeight * 0.57, Math.max(2, Math.floor(width / 3.2)), materials.wallLight, windows);
      }
      box(group, materials.wood, 0, 1.65, depth / 2 + 0.09, 1.5, 2.25, 0.2);
      box(group, materials.gold, 0, 1.55, depth / 2 + 0.21, 0.08, 1.2, 0.05);
      const roofMesh = makeMesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.79, 2.9, 4), roof, group, [0, 0.7 + height + 1.35, 0]);
      roofMesh.rotation.y = Math.PI / 4;
      return roofMesh;
    };

    const addLocationModel = (definition) => {
      const group = new THREE.Group();
      group.name = definition.label;
      group.position.set(definition.x, 0, definition.z);
      group.rotation.y = Math.atan2(-definition.x, -definition.z);
      group.userData.definition = definition;
      locationLayer.add(group);
      const [width, depth] = definition.size;
      const baseMaterial = definition.kind === "sports" ? materials.sportsFieldAlt
        : definition.kind === "garden" ? materials.leaf
          : definition.kind === "arena" ? materials.roofPurple
            : materials.pathEdge;
      const base = makeMesh(new THREE.CylinderGeometry(Math.max(width, depth) * 0.72, Math.max(width, depth) * 0.82, 0.25, 24), baseMaterial, group, [0, 0.04, 0], false);
      base.scale.z = 0.65;
      const glowRing = makeMesh(new THREE.TorusGeometry(Math.max(width, depth) * 0.72, 0.12, 6, 40), materials.gold, group, [0, 0.35, 0], false);
      glowRing.rotation.x = Math.PI / 2;
      glowRing.visible = false;
      group.userData.glowRing = glowRing;

      switch (definition.kind) {
        case "gate": {
          [-1, 1].forEach((side) => {
            const x = side * 5;
            box(group, materials.foundation, x, 0.35, 0, 1.9, 0.7, 2.1);
            box(group, materials.towerWall, x, 3.5, 0, 1.45, 6.3, 1.65);
            box(group, materials.wallLight, x, 3.5, 0.88, 0.78, 5.2, 0.12);
            box(group, materials.gold, x, 0.95, 0.92, 1.58, 0.18, 0.12);
            box(group, materials.roofLight, x, 6.8, 0, 1.9, 0.48, 2.05);
            box(group, materials.gold, x, 7.1, 0, 2.05, 0.14, 2.2);
            box(group, materials.banner, x - side * 0.38, 4.7, 1.02, 0.42, 1.5, 0.08);
            box(group, materials.purple, x - side * 0.38, 4.0, 1.08, 0.42, 0.12, 0.1);
          });
          box(group, materials.roof, 0, 7.15, 0, 12.2, 1.45, 1.85);
          box(group, materials.wallLight, 0, 7.08, 0.96, 10.8, 1.08, 0.16);
          box(group, materials.gold, 0, 7.92, 0.98, 11.2, 0.12, 0.18);
          box(group, materials.gold, 0, 6.28, 0.98, 11.2, 0.1, 0.18);
          const gateSign = addTextSprite("CAMPUSQUEST");
          gateSign.position.set(0, 7.08, 1.08);
          gateSign.scale.set(7.2, 1.55, 1);
          makeMesh(new THREE.OctahedronGeometry(0.62, 0), materials.purple, group, [0, 5.75, 1.15], false).rotation.z = Math.PI / 4;
          makeMesh(new THREE.SphereGeometry(0.22, 8, 6), materials.gold, group, [0, 5.75, 1.72], false);
          [-1, 1].forEach((side) => {
            const armX = side * 3.75;
            cylinder(group, materials.roof, armX, 0.8, 0.2, 0.22, 0.26, 1.6, 8);
            box(group, materials.gold, armX - side * 0.65, 1.55, 0.2, 2.5, 0.16, 0.18);
            box(group, materials.wallLight, armX + side * 0.05, 1.55, 0.2, 0.5, 0.18, 0.2);
          });
          box(group, materials.pathEdge, 0, 0.16, -0.55, 6.9, 0.18, 0.55);
          box(group, materials.paleGold, -7.9, 1.65, 1.8, 2.9, 3.3, 2.6);
          box(group, materials.roof, -7.9, 3.42, 1.8, 3.2, 0.35, 2.9);
          box(group, materials.blueGlass, -7.9, 1.9, 3.13, 1.9, 1.25, 0.12);
          box(group, materials.banner, -7.9, 3.8, 3.15, 2.8, 0.38, 0.12);
          const securitySign = addTextSprite("SECURITY");
          securitySign.position.set(-7.9, 3.8, 3.23);
          securitySign.scale.set(2.35, 0.54, 1);
          group.add(securitySign);
          cylinder(group, materials.roofPurple, -7.9, 1.2, 2.78, 0.26, 0.3, 0.75, 7);
          makeMesh(new THREE.SphereGeometry(0.24, 8, 6), materials.skin, group, [-7.9, 1.78, 2.78], false);
          box(group, materials.gold, -7.9, 1.47, 2.98, 0.46, 0.12, 0.06);
          break;
        }
        case "tower": {
          box(group, materials.foundation, 0, 0.35, 0, 9, 0.7, 9);
          for (let floor = 0; floor < 4; floor += 1) {
            const y = 1.9 + floor * 3.15;
            box(group, materials.towerWall, 0, y, 0, 6.8, 3.05, 6.8);
            box(group, materials.stone, 0, y + 1.5, 3.48, 7.1, 0.2, 0.28);
            addWindows(group, 5.8, 3.42, y + 0.1, 2, materials.towerWall);
            [-3.4, 3.4].forEach((x) => box(group, materials.gold, x, y, 3.54, 0.09, 2.8, 0.12));
          }
          box(group, materials.pathEdge, 0, 0.16, 6.5, 11.5, 0.2, 4.1);
          for (let step = 0; step < 3; step += 1) {
            box(group, materials.stoneLight, 0, 0.16 + step * 0.19, 4.4 + step * 0.55, 7 + step * 1.1, 0.16, 0.55);
          }
          [-5.1, 5.1].forEach((x) => {
            makeTreeIn(group, x, 8.2, 0.6);
            makeMesh(new THREE.SphereGeometry(0.48, 8, 6), materials.purple, group, [x, 0.76, 7.5], false);
          });
          const towerRoof = makeMesh(new THREE.ConeGeometry(5.1, 4.6, 4), materials.roofLight, group, [0, 15.4, 0]);
          towerRoof.rotation.y = Math.PI / 4;
          cylinder(group, materials.gold, 0, 18.2, 0, 0.2, 0.2, 2.2, 6);
          makeMesh(new THREE.TorusGeometry(1.1, 0.12, 6, 20), materials.gold, group, [0, 18.6, 0], false);
          makeMesh(new THREE.SphereGeometry(0.42, 8, 6), materials.lamp, group, [0, 19.5, 0], false);
          const beacon = new THREE.PointLight("#f4c95d", 2.1, 24, 2);
          beacon.position.set(0, 19.5, 0);
          group.add(beacon);
          break;
        }
        case "lab": {
          addBuildingBody(group, { width: 10.5, depth: 7, height: 4.5, wall: materials.towerWall, roof: materials.roofLight, floors: 1, windows: materials.blueGlass });
          box(group, materials.roof, 0, 5.9, 0, 11.5, 0.38, 7.8);
          [-3, -1, 1, 3].forEach((x) => box(group, materials.blueGlass, x, 3, 3.62, 0.14, 3, 0.1));
          box(group, materials.blue, 0, 0.65, 4.1, 7.5, 0.18, 0.28);
          box(group, materials.pathEdge, 0, 0.18, 6.1, 12.5, 0.22, 3.4);
          box(group, materials.blue, 0, 0.34, 4.75, 4.4, 0.12, 0.3);
          [-3.6, 0, 3.6].forEach((x) => {
            box(group, materials.blueGlass, x, 0.8, 6.35, 0.18, 0.85, 0.18);
            makeMesh(new THREE.SphereGeometry(0.18, 8, 6), materials.blue, group, [x, 1.25, 6.35], false);
          });
          [-2.6, -1.3, 0, 1.3, 2.6].forEach((x, index) => {
            box(group, materials.blue, x, 5.95, -0.9, 0.12, 0.08, 1.5);
            if (index % 2 === 0) makeMesh(new THREE.SphereGeometry(0.12, 6, 5), materials.blue, group, [x, 5.98, -1.65], false);
          });
          const labGlow = new THREE.PointLight("#4f8dff", 1.2, 18, 2);
          labGlow.position.set(0, 4.4, 4.5);
          group.add(labGlow);
          break;
        }
        case "auditorium": {
          addBuildingBody(group, { width: 13, depth: 8, height: 4.2, wall: materials.wall, roof: materials.roof, floors: 1 });
          box(group, materials.pathEdge, 0, 0.15, 8.7, 17, 0.2, 6.2);
          for (let step = 0; step < 4; step += 1) {
            box(group, materials.stoneLight, 0, 0.18 + step * 0.23, 5 + step * 0.5, 8 + step * 1.2, 0.2, 0.75);
          }
          box(group, materials.banner, 0, 4.15, 4.18, 5.5, 1.1, 0.2);
          box(group, materials.gold, 0, 4.15, 4.31, 5.15, 0.12, 0.06);
          const eventSign = addTextSprite("CAMPUS EVENTS");
          eventSign.position.set(0, 4.15, 4.38);
          eventSign.scale.set(4, 1, 1);
          [-7.4, 7.4].forEach((x) => {
            box(group, materials.roof, x, 1.85, 7.25, 1.5, 2.6, 0.25);
            box(group, x < 0 ? materials.purple : materials.gold, x, 2, 7.42, 1.15, 1.8, 0.08);
            box(group, materials.gold, x, 3.35, 7.42, 1.42, 0.12, 0.1);
          });
          [-6, 6].forEach((x) => {
            cylinder(group, materials.roof, x, 2, 9.5, 0.1, 0.13, 4, 8);
            makeMesh(new THREE.SphereGeometry(0.22, 8, 6), materials.lamp, group, [x, 4, 9.5], false);
          });
          break;
        }
        case "cafe": {
          addBuildingBody(group, { width: 8, depth: 6.5, height: 3.5, wall: materials.wallLight, roof: materials.roofLight, floors: 1 });
          box(group, materials.wood, 0, 4.3, 0, 8.8, 0.24, 6.8);
          box(group, materials.orange, 0, 2.5, 3.45, 3.4, 0.55, 0.16);
          box(group, materials.wood, 0, 1.6, 3.55, 2.1, 2.4, 0.18);
          box(group, materials.pathEdge, 0, 0.16, 8.2, 17, 0.22, 8.4);
          box(group, materials.wood, 0, 4.05, 3.74, 4.2, 0.28, 0.22);
          const cafeSign = addTextSprite("CAMPUS CAFE");
          cafeSign.position.set(0, 4.55, 3.75);
          cafeSign.scale.set(3.7, 0.92, 1);
          [[-5.1, 7.4], [0, 9.2], [5.1, 7.4]].forEach(([x, z], index) => {
            cylinder(group, materials.wood, x, 0.88, z, 0.78, 0.82, 0.2, 10);
            cylinder(group, materials.wood, x, 0.48, z, 0.11, 0.14, 0.76, 8);
            cylinder(group, materials.gold, x, 1.1, z, 0.12, 0.13, 0.28, 8);
            cylinder(group, materials.wood, x, 0.52, z - 1.15, 0.12, 0.16, 0.82, 8);
            box(group, materials.wood, x, 0.92, z - 1.12, 1.1, 0.16, 0.45);
            cylinder(group, materials.roof, x, 2.6, z, 0.09, 0.1, 2.9, 8);
            cone(group, index === 1 ? materials.purple : materials.orange, x, 3.75, z, 1.45, 0.62, 10);
            makeMesh(new THREE.SphereGeometry(0.16, 7, 5), materials.lamp, group, [x, 3.35, z], false);
          });
          [[-7.6, 5.2], [7.6, 5.2], [-7.6, 11], [7.6, 11]].forEach(([x, z]) => {
            cylinder(group, materials.leafLight, x, 0.55, z, 0.52, 0.58, 1.05, 8);
            makeMesh(new THREE.SphereGeometry(0.65, 8, 6), materials.leafLight, group, [x, 1.12, z], false);
          });
          const cafeGlow = new THREE.PointLight("#f3a85b", 1.1, 14, 2);
          cafeGlow.position.set(0, 4, 4.8);
          group.add(cafeGlow);
          break;
        }
        case "hub": {
          cylinder(group, materials.stoneLight, 0, 0.28, 0, 6.7, 6.7, 0.55, 10);
          cylinder(group, materials.wallLight, 0, 2.4, 0, 5.7, 6.2, 4.2, 10);
          cylinder(group, materials.roofLight, 0, 5.1, 0, 6.5, 6.1, 1.5, 10);
          cylinder(group, materials.roof, 0, 6.3, 0, 3.9, 6.3, 1.2, 10);
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 5) {
            const x = Math.sin(angle) * 5.75;
            const z = Math.cos(angle) * 5.75;
            box(group, materials.window, x, 2.8, z, 0.95, 1.5, 0.28);
          }
          box(group, materials.wood, 0, 1.75, 5.9, 1.5, 2.5, 0.24);
          box(group, materials.pathEdge, 0, 0.19, 8.2, 14.8, 0.24, 3.8);
          box(group, materials.orange, 0, 0.36, 6.6, 8.2, 0.2, 1.2);
          makeMesh(new THREE.TorusGeometry(5.6, 0.08, 6, 32), materials.gold, group, [0, 0.43, 0], false).rotation.x = -Math.PI / 2;
          const hubSign = addTextSprite("STUDENT HUB");
          hubSign.position.set(0, 6.45, 3.35);
          hubSign.scale.set(4.5, 1.05, 1);
          break;
        }
        case "board": {
          box(group, materials.wood, 0, 1.8, 0, 5.4, 3.6, 0.55);
          box(group, materials.roof, 0, 3.9, 0, 6.3, 0.25, 1.1);
          for (let i = 0; i < 3; i += 1) {
            box(group, i === 1 ? materials.gold : materials.wallLight, -1.6 + i * 1.6, 2, 0.33, 1.1, 1.55, 0.08);
          }
          box(group, materials.wood, -2, 0.8, 0, 0.18, 1.7, 0.18);
          box(group, materials.wood, 2, 0.8, 0, 0.18, 1.7, 0.18);
          break;
        }
        case "academic":
        case "library":
        case "garden":
          break;
        case "sports":
          makeSportsGround(group);
          break;
        case "arena": {
          addBuildingBody(group, { width: 10, depth: 7, height: 4.4, wall: materials.towerWall, roof: materials.roofPurple, floors: 1, windows: materials.arenaGlass });
          box(group, materials.arenaGlass, 0, 3.3, 3.65, 4.4, 2.4, 0.12);
          const controller = makeMesh(new THREE.TorusGeometry(1.1, 0.18, 8, 18), materials.purple, group, [0, 3.3, 3.85]);
          controller.scale.set(1.5, 0.75, 0.45);
          box(group, materials.wallLight, -0.8, 3.3, 3.97, 0.2, 0.7, 0.1);
          box(group, materials.wallLight, -0.8, 3.3, 3.97, 0.7, 0.2, 0.1);
          makeMesh(new THREE.SphereGeometry(0.15, 8, 6), materials.gold, group, [1, 3.5, 4], false);
          box(group, materials.purple, 0, 0.36, 5.25, 7, 0.18, 2.6);
          box(group, materials.arenaGlass, 0, 0.52, 4.25, 4.2, 0.12, 0.28);
          [-1, 1].forEach((side) => {
            cylinder(group, materials.roof, side * 5.2, 2.1, 4.2, 0.1, 0.13, 4.2, 8);
            makeMesh(new THREE.SphereGeometry(0.2, 8, 6), materials.purple, group, [side * 5.2, 4.2, 4.2], false);
          });
          const arenaGlow = new THREE.PointLight("#8059d6", 1.15, 15, 2);
          arenaGlow.position.set(0, 3.8, 4.4);
          group.add(arenaGlow);
          break;
        }
        default:
          addBuildingBody(group, { width: 10, depth: 7, height: 4.6, wall: materials.wallLight, roof: materials.roof, floors: 2 });
      }

      if (definition.kind === "library" || definition.kind === "academic") {
        addBuildingBody(group, {
          width: definition.kind === "library" ? 12 : 13,
          depth: 8,
          height: definition.kind === "library" ? 5.2 : 5.5,
          wall: definition.kind === "library" ? materials.wallLight : materials.wall,
          roof: definition.kind === "library" ? materials.roofLight : materials.roof,
          floors: 2,
        });
        if (definition.kind === "library") {
          box(group, materials.roof, 0, 7.1, 4.18, 2.6, 0.9, 0.18);
          box(group, materials.gold, 0, 7.1, 4.31, 1.45, 0.62, 0.06);
          box(group, materials.foundation, 0, 7.1, 4.35, 0.1, 0.44, 0.04);
          [-0.72, 0, 0.72].forEach((x, index) => {
            box(group, [materials.purple, materials.blue, materials.orange][index], x, 7.1, 4.44, 0.36, 0.72, 0.09);
            box(group, materials.gold, x, 6.76, 4.5, 0.28, 0.06, 0.04);
          });
          box(group, materials.pathEdge, 0, 0.18, 7, 14.5, 0.22, 4.2);
          for (let step = 0; step < 3; step += 1) {
            box(group, materials.stoneLight, 0, 0.2 + step * 0.18, 5.2 + step * 0.55, 7.2 + step * 1.2, 0.16, 0.55);
          }
          [-7.2, 7.2].forEach((x) => {
            makeTreeIn(group, x, 9.1, 0.68);
            box(group, materials.roof, x, 0.95, 8, 2.5, 0.16, 0.58);
            box(group, materials.wood, x, 1.35, 7.82, 2.5, 0.68, 0.16);
          });
          [-4, 4].forEach((x) => {
            cylinder(group, materials.leafLight, x, 0.52, 9.7, 0.6, 0.68, 0.9, 8);
            makeMesh(new THREE.SphereGeometry(0.66, 8, 6), materials.purple, group, [x, 1.15, 9.7], false);
          });
        } else {
          box(group, materials.pathEdge, 0, 0.16, 6.9, 15.5, 0.2, 3.8);
          for (let step = 0; step < 3; step += 1) {
            box(group, materials.stoneLight, 0, 0.18 + step * 0.18, 4.8 + step * 0.48, 7 + step * 1.1, 0.16, 0.48);
          }
        }
        const columnCount = 4;
        for (let index = 0; index < columnCount; index += 1) {
          const x = -4.5 + index * 3;
          cylinder(group, materials.stoneLight, x, 2.2, 4.25, 0.18, 0.24, 4.2, 8);
        }
        box(group, materials.gold, 0, 6.2, 4.27, 4.2, 0.3, 0.2);
      }

      const label = addTextSprite(definition.label);
      label.position.set(0, definition.kind === "tower" ? 21.7 : definition.kind === "gate" ? 9.2 : 8.7, 0);
      group.add(label);

      const markerGroup = new THREE.Group();
      markerGroup.position.set(0, definition.kind === "tower" ? 16.5 : 6.9, 0);
      group.add(markerGroup);
      cylinder(markerGroup, materials.gold, 0, 0.65, 0, 0.055, 0.07, 1.3, 6);
      const questMarker = makeMesh(new THREE.OctahedronGeometry(0.62, 0), materials.gold, markerGroup, [0, 1.5, 0]);
      questMarker.rotation.z = Math.PI / 4;
      const markerHalo = makeMesh(new THREE.TorusGeometry(0.76, 0.06, 6, 18), materials.gold, markerGroup, [0, 1.5, 0], false);
      markerHalo.rotation.x = Math.PI / 2;
      const questSymbol = addTextSprite("✦", 64);
      questSymbol.position.set(0, 1.5, 0.05);
      markerGroup.add(questSymbol);
      markerGroup.traverse((child) => { child.userData.questMarker = true; });
      group.userData.marker = markerGroup;
      group.userData.markerMesh = questMarker;
      group.userData.markerHalo = markerHalo;
      group.userData.location = null;
      group.userData.hovered = false;
      group.traverse((child) => {
        if (child.isMesh || child.isSprite) {
          child.userData.locationGroup = group;
          child.userData.locationKind = definition.kind;
        }
      });
      return group;
    };

    const locationGroups = new Map(campusLocations.map((definition) => [definition.name, addLocationModel(definition)]));
    const player = new THREE.Group();
    player.name = "Virtual explorer";
    scene.add(player);
    const avatarMaterial = makeMaterial("#5f9ddb", { emissive: "#244e81", emissiveIntensity: 0.2 });
    cylinder(player, makeMaterial("#c49a67"), 0, 0.42, 0, 0.34, 0.42, 0.8, 8);
    makeMesh(new THREE.SphereGeometry(0.34, 10, 8), makeMaterial("#e5c6a0"), player, [0, 1.13, 0]);
    box(player, avatarMaterial, 0, 0.55, 0, 0.68, 0.55, 0.48);
    const playerHalo = makeMesh(new THREE.TorusGeometry(0.95, 0.07, 6, 24), materials.blue, player, [0, 0.16, 0], false);
    playerHalo.rotation.x = Math.PI / 2;
    const playerStart = campusLocations.find((location) => location.kind === "gate");
    player.position.set(playerStart.x, 0.2, playerStart.z - 4);
    const playerTarget = player.position.clone();
    let playerFrom = player.position.clone();
    let playerMoveStart = 0;
    let playerMoving = false;
    let pendingVirtualLocation = null;
    let virtualPosition = { x: player.position.x, z: player.position.z };
    let currentVirtualLocation = "Main Gate";

    const npcLayer = new THREE.Group();
    npcLayer.name = "Campus pedestrians";
    scene.add(npcLayer);
    const pedestrianClothes = ["#4f83b7", "#78599e", "#d5bc84", "#47775a", "#39465e", "#b86e55", "#538d9b", "#9a6682"]
      .map((color) => makeMaterial(color, { roughness: 0.82 }));
    const pedestrianTrousers = makeMaterial("#273348");
    const pedestrianSkin = makeMaterial("#dfb58b");
    const pedestrianHair = makeMaterial("#3a2c28");
    const pedestrianPack = makeMaterial("#d1a64e");
    const collisionZones = campusLocations
      .filter(({ kind }) => !["gate", "sports", "board"].includes(kind))
      .map(({ x, z, size, kind }) => ({
        x,
        z,
        radius: Math.max(...size) * (kind === "garden" ? 0.28 : 0.34),
      }));
    collisionZones.push(
      ...treePlacements.map(([x, z, scale]) => ({ x, z, radius: 0.72 * scale })),
      ...pedestrianFurniture.map(([x, z, radius]) => ({ x, z, radius })),
      ...amenityGroups.map((group) => ({
        x: group.position.x,
        z: group.position.z,
        radius: group.userData.collisionRadius,
      })),
      ...[
        [-28.3, 51, 1.35], [-23.7, 51, 1.35], [-18.8, 51, 1.35],
        [-27.1, 61, 1.35], [-22, 61, 1.35], [-16.8, 61, 1.35],
      ].map(([x, z, radius]) => ({ x, z, radius })),
      { x: 0, z: 0, radius: 3.1 },
      { x: -55, z: -50, width: 9.2, depth: 6.7 },
    );
    const pointBlocked = (x, z) => {
      if (Math.abs(x) > 72 || Math.abs(z) > 64) return true;
      if (z > 55 && (x < -58 || x > 60)) return true;
      if (z < -55 && (x < -59 || x > 57)) return true;
      return collisionZones.some((zone) => {
        if (zone.width) return Math.abs(x - zone.x) < zone.width && Math.abs(z - zone.z) < zone.depth;
        return Math.hypot(x - zone.x, z - zone.z) < zone.radius + 0.45;
      });
    };
    const routeForNodes = (from, to) => campusRoutes.find((route) => route.from === from && route.to === to)
      || campusRoutes.find((route) => route.from === to && route.to === from);
    const buildPedestrianLoop = (nodes) => {
      const points = [];
      for (let index = 0; index < nodes.length; index += 1) {
        const from = nodes[index];
        const to = nodes[(index + 1) % nodes.length];
        const route = routeForNodes(from, to);
        if (!route) continue;
        const coordinates = route.from === from ? route.points : [...route.points].reverse();
        const curve = new THREE.CatmullRomCurve3(coordinates.map(([x, z]) => new THREE.Vector3(x, 0.22, z)));
        const steps = Math.max(6, Math.ceil(curve.getLength() / 1.25));
        for (let step = 0; step < steps; step += 1) {
          const point = curve.getPoint(step / steps);
          const previous = points[points.length - 1];
          if (!previous || previous.distanceTo(point) > 0.25) points.push(point);
        }
      }
      return points;
    };
    const pedestrianLoops = [
      ["Main Gate", "Shuttle Stop", "Information Kiosk", "Main Gate", "Management Block", "Plaza", "Library", "Campus Bookstore", "Library", "Hostel", "Library", "Plaza", "IT Block", "Parking", "Garden", "Sports Ground", "Garden", "Parking", "Canteen", "Food Street", "Nescafé", "Food Street", "Canteen", "Management Block"],
      ["Vehicle Parking", "Main Gate", "Shuttle Stop", "Information Kiosk", "Main Gate", "Management Block", "Plaza", "Main Academic Block", "Campus Stationery", "Print & Copy", "Library", "Auditorium", "Plaza", "IT Block", "Parking", "Canteen", "Management Block", "Main Gate"],
      ["Auditorium", "Main Academic Block", "Cricket Practice Net", "Main Academic Block", "Campus Stationery", "Print & Copy", "Library", "Campus Bookstore", "Library", "Hostel", "Library", "Plaza", "Administration", "Plaza"],
      ["Main Gate", "Vehicle Parking", "Main Academic Block", "Auditorium", "Plaza", "Management Block", "Canteen", "Food Street", "Nescafé", "Food Street", "Canteen", "Parking", "Garden", "Sports Ground", "Garden", "Parking", "Canteen", "Management Block"],
    ].map(buildPedestrianLoop).filter((points) => points.length > 2);
    const initialAmenityStops = [
      "Nescafé", "Campus Stationery", "Campus Bookstore", "Food Street",
      "Nescafé", "Print & Copy", "Campus Bookstore", "Food Street",
    ];
    const amenityStopPoints = [
      "Shuttle Stop", "Information Kiosk", "Nescafé", "Food Street",
      "Campus Bookstore", "Campus Stationery", "Print & Copy", "Sports Ground", "Canteen",
    ].map((name) => locationExits.get(name)).filter(Boolean)
      .map(([x, z]) => new THREE.Vector3(x, 0.22, z));
    const createPedestrian = (index, clothes) => {
      const root = new THREE.Group();
      root.name = `Campus student ${index + 1}`;
      const torso = box(root, clothes, 0, 1.05, 0, 0.72, 0.82, 0.42);
      const head = makeMesh(new THREE.SphereGeometry(0.27, 8, 6), pedestrianSkin, root, [0, 1.72, 0]);
      makeMesh(new THREE.SphereGeometry(0.28, 8, 6), pedestrianHair, root, [0, 1.82, -0.035], false);
      head.scale.set(0.9, 0.92, 0.9);
      const pack = box(root, pedestrianPack, 0, 1.18, -0.3, 0.38, 0.52, 0.18);
      pack.visible = index % 3 !== 1;
      const armPivots = [-1, 1].map((side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.42, 1.35, 0);
        root.add(pivot);
        cylinder(pivot, clothes, 0, -0.34, 0, 0.13, 0.16, 0.7, 6);
        makeMesh(new THREE.SphereGeometry(0.11, 6, 5), pedestrianSkin, pivot, [0, -0.7, 0], false);
        return pivot;
      });
      const legPivots = [-1, 1].map((side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.19, 0.66, 0);
        root.add(pivot);
        cylinder(pivot, pedestrianTrousers, 0, -0.32, 0, 0.15, 0.18, 0.68, 6);
        box(pivot, materials.foundation, 0, -0.67, 0.08, 0.26, 0.12, 0.38);
        return pivot;
      });
      root.traverse((part) => {
        if (part.isMesh) {
          part.castShadow = false;
          part.receiveShadow = false;
        }
      });
      const burstGeometry = new THREE.BufferGeometry();
      burstGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
        0, 0.6, 0, -0.5, 1, 0, 0.5, 1, 0, 0, 1.2, 0, -0.35, 1.45, 0.15, 0.35, 1.45, -0.15,
      ], 3));
      const burst = new THREE.Points(burstGeometry, new THREE.PointsMaterial({
        color: "#f4c95d", size: 0.55, transparent: true, opacity: 0, depthWrite: false,
      }));
      burst.visible = false;
      npcLayer.add(burst);
      torso.userData.pedestrianBody = true;
      root.userData.armPivots = armPivots;
      root.userData.legPivots = legPivots;
      root.userData.slot = index;
      npcLayer.add(root);
      const loop = pedestrianLoops[index % pedestrianLoops.length];
      const startPosition = locationExits.get(initialAmenityStops[index]);
      const initialIndex = startPosition && index < initialAmenityStops.length
        ? loop.reduce((nearest, point, pointIndex) => (
          Math.hypot(point.x - startPosition[0], point.z - startPosition[1])
            < Math.hypot(loop[nearest].x - startPosition[0], loop[nearest].z - startPosition[1])
            ? pointIndex : nearest
        ), 0)
        : Math.floor(Math.random() * loop.length);
      root.position.copy(loop[initialIndex]);
      root.userData.loop = loop;
      root.userData.pathIndex = initialIndex;
      root.userData.speed = 2.1 + Math.random() * 1.05;
      root.userData.phase = Math.random() * Math.PI * 2;
      root.userData.pauseUntil = 0;
      root.userData.blockedSince = 0;
      root.userData.fadeUntil = 0;
      root.userData.respawnAt = 0;
      root.userData.state = Math.random() < 0.2 ? "IDLE" : "WALKING";
      root.userData.idleStarted = 0;
      root.userData.idleDuration = 1.2 + Math.random() * 2;
      root.userData.laneOffset = 0;
      root.userData.clothes = clothes;
      root.userData.burst = burst;
      return root;
    };
    const pedestrians = Array.from({ length: 14 }, (_, index) => createPedestrian(index, pedestrianClothes[index % pedestrianClothes.length]));
    const startPedestrianFade = (pedestrian, elapsed) => {
      pedestrian.userData.state = "FADING";
      pedestrian.userData.fadeUntil = elapsed + 0.38;
      pedestrian.userData.respawnAt = elapsed + 2 + Math.random() * 3;
      pedestrian.userData.blockedSince = 0;
      pedestrian.userData.burst.position.copy(pedestrian.position);
      pedestrian.userData.burst.visible = true;
    };
    const respawnPedestrian = (pedestrian) => {
      const loop = pedestrianLoops[Math.floor(Math.random() * pedestrianLoops.length)];
      const start = Math.floor(Math.random() * loop.length);
      pedestrian.userData.loop = loop;
      pedestrian.userData.pathIndex = start;
      pedestrian.userData.speed = 2.1 + Math.random() * 1.05;
      pedestrian.userData.state = "WALKING";
      pedestrian.userData.laneOffset = 0;
      pedestrian.position.copy(loop[start]);
      pedestrian.visible = true;
      pedestrian.scale.setScalar(0.9 + Math.random() * 0.18);
      pedestrian.userData.burst.visible = false;
    };
    const updatePedestrians = (elapsed, delta) => {
      pedestrians.forEach((pedestrian) => {
        const data = pedestrian.userData;
        if (data.state === "FADING") {
          const remaining = Math.max(0, (data.fadeUntil - elapsed) / 0.38);
          pedestrian.scale.setScalar(remaining);
          data.burst.scale.setScalar(0.35 + (1 - remaining) * 1.3);
          data.burst.material.opacity = remaining;
          if (elapsed >= data.fadeUntil) pedestrian.visible = false;
          if (elapsed >= data.respawnAt) respawnPedestrian(pedestrian);
          return;
        }
        if (data.state === "IDLE") {
          if (elapsed - data.idleStarted > data.idleDuration) data.state = "WALKING";
          return;
        }
        if (data.pauseUntil > elapsed) return;
        const loop = data.loop;
        const nextIndex = (data.pathIndex + 1) % loop.length;
        const target = loop[nextIndex];
        const dx = target.x - pedestrian.position.x;
        const dz = target.z - pedestrian.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 0.35) {
          data.pathIndex = nextIndex;
          const stopAtAmenity = amenityStopPoints.some((point) => point.distanceTo(target) < 1.3);
          if (stopAtAmenity ? Math.random() < 0.7 : Math.random() < 0.065) {
            data.pauseUntil = elapsed + (stopAtAmenity ? 1.2 + Math.random() * 2.6 : 0.5 + Math.random() * 1.6);
            if (Math.random() < 0.35) {
              data.state = "IDLE";
              data.idleStarted = elapsed;
              data.idleDuration = data.pauseUntil - elapsed;
            }
          }
          return;
        }
        const step = Math.min(distance, data.speed * delta);
        const directionX = dx / distance;
        const directionZ = dz / distance;
        const proposedX = pedestrian.position.x + directionX * step;
        const proposedZ = pedestrian.position.z + directionZ * step;
        let moveX = proposedX;
        let moveZ = proposedZ;
        if (pointBlocked(moveX, moveZ)) {
          const sideX = -directionZ;
          const sideZ = directionX;
          const candidates = [1.6, -1.6, 2.8, -2.8].map((offset) => ({
            x: proposedX + sideX * offset,
            z: proposedZ + sideZ * offset,
          }));
          const safe = candidates.find((candidate) => !pointBlocked(candidate.x, candidate.z));
          if (safe) {
            moveX = safe.x;
            moveZ = safe.z;
            data.blockedSince = 0;
          } else {
            if (!data.blockedSince) data.blockedSince = elapsed;
            if (elapsed - data.blockedSince > 0.7) startPedestrianFade(pedestrian, elapsed);
            return;
          }
        } else {
          data.blockedSince = 0;
        }
        pedestrian.position.x = moveX;
        pedestrian.position.z = moveZ;
        pedestrian.position.y = 0.2 + (reducedMotion ? 0 : Math.abs(Math.sin(elapsed * 8 + data.phase)) * 0.07);
        pedestrian.rotation.y = Math.atan2(directionX, directionZ);
        const stride = reducedMotion ? 0 : Math.sin(elapsed * 8 + data.phase) * 0.48;
        data.armPivots.forEach((arm, side) => { arm.rotation.x = stride * (side ? 1 : -1); });
        data.legPivots.forEach((leg, side) => { leg.rotation.x = stride * (side ? -1 : 1); });
      });
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const locationObjects = [...locationGroups.values()];
    const raycastTargets = [];
    locationObjects.forEach((group) => group.traverse((object) => {
      if (object.isMesh || object.isSprite) raycastTargets.push(object);
    }));
    amenityGroups.forEach((group) => group.traverse((object) => {
      if (object.isMesh || object.isSprite) raycastTargets.push(object);
    }));
    let hoveredGroup = null;
    let selectedGroup = null;
    let focusAnimation = null;
    let selectedPath = null;
    let selectedParticles = null;
    let animationFrame = 0;
    let disposed = false;
    let defaultDistance = 100;
    let lastPointer = null;

    const updateZoomLabel = () => {
      const output = document.querySelector("#map-zoom-level");
      if (!output) return;
      const value = Math.max(25, Math.min(200, Math.round((defaultDistance / cameraDistance()) * 100)));
      output.value = `${value}%`;
      output.textContent = `${value}%`;
    };
    const cameraDistance = () => camera.position.distanceTo(controls.target);
    const updateFog = (distance) => {
      scene.fog.near = Math.max(65, distance * 0.72);
      scene.fog.far = Math.max(scene.fog.near + 125, distance * 1.75);
    };
    const resize = (refit = false) => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (refit) fitCampusToView({ preserveView: true });
      else renderer.render(scene, camera);
    };
    const fitCampusToView = ({ preserveView = false } = {}) => {
      scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(ground);
      bounds.expandByObject(locationLayer);
      bounds.expandByObject(decorationLayer);
      bounds.expandByObject(player);
      bounds.expandByScalar(3);
      const center = bounds.getCenter(new THREE.Vector3());
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      const verticalFov = camera.fov * DEG;
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const fitFov = Math.min(verticalFov, horizontalFov);
      const distanceForFit = sphere.radius / Math.sin(fitFov / 2) * 1.1;
      if (preserveView) {
        const targetOffset = center.distanceTo(controls.target);
        const distance = Math.max(cameraDistance(), (sphere.radius + targetOffset) / Math.sin(fitFov / 2) * 1.14);
        const cameraOffset = camera.position.clone().sub(controls.target);
        camera.position.copy(controls.target).add(cameraOffset.setLength(distance));
      } else {
        controls.target.copy(center);
        const distance = distanceForFit;
        defaultDistance = distance;
        const theta = 45 * DEG;
        const phi = 42 * DEG;
        camera.position.set(
          center.x + distance * Math.sin(phi) * Math.sin(theta),
          center.y + distance * Math.cos(phi),
          center.z + distance * Math.sin(phi) * Math.cos(theta),
        );
      }
      const distance = cameraDistance();
      defaultDistance = distance;
      updateFog(distance);
      camera.near = Math.max(0.1, distance / 300);
      camera.far = distance * 6;
      camera.updateProjectionMatrix();
      controls.minDistance = Math.max(32, sphere.radius * 0.34);
      controls.maxDistance = distance * 2.5;
      controls.update();
      updateZoomLabel();
    };
    const focusView = (polar, azimuth) => {
      const target = controls.target.clone();
      const distance = cameraDistance();
      camera.position.set(
        target.x + distance * Math.sin(polar) * Math.sin(azimuth),
        target.y + distance * Math.cos(polar),
        target.z + distance * Math.sin(polar) * Math.cos(azimuth),
      );
      controls.update();
    };
    const updateTooltip = (group, clientX, clientY) => {
      if (!tooltip) return;
      if (!group) {
        tooltip.hidden = true;
        return;
      }
      const definition = group.userData.definition || group.userData.amenity;
      const anchor = new THREE.Vector3(0, definition.kind === "tower" ? 20 : group.userData.amenity ? 4.2 : 7.8, 0);
      group.localToWorld(anchor);
      anchor.project(camera);
      const rect = container.getBoundingClientRect();
      const x = clientX ?? rect.left + ((anchor.x + 1) / 2) * rect.width;
      const y = clientY ?? rect.top + ((1 - anchor.y) / 2) * rect.height;
      tooltip.textContent = definition.label || definition.name;
      tooltip.style.left = `${Math.max(12, Math.min(rect.width - 150, x - rect.left + 12))}px`;
      tooltip.style.top = `${Math.max(12, Math.min(rect.height - 42, y - rect.top - 14))}px`;
      tooltip.hidden = false;
    };
    const clearSelectedPath = () => {
      if (selectedPath) {
        ground.remove(selectedPath);
        selectedPath.geometry.dispose();
        selectedPath.material.dispose();
        selectedPath = null;
      }
      if (selectedParticles) {
        scene.remove(selectedParticles);
        selectedParticles.geometry.dispose();
        selectedParticles.material.dispose();
        selectedParticles = null;
      }
    };
    const findCampusRoute = (start, destination) => {
      if (start === destination) return [];
      const previous = new Map([[start, null]]);
      const queue = [start];
      for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        for (const route of routeGraph.get(current) || []) {
          const next = route.from === current ? route.to : route.from;
          if (previous.has(next)) continue;
          previous.set(next, { current, route });
          if (next === destination) {
            const steps = [];
            let cursor = destination;
            while (cursor !== start) {
              const entry = previous.get(cursor);
              steps.push({ route: entry.route, forward: entry.route.from === entry.current });
              cursor = entry.current;
            }
            return steps.reverse();
          }
          queue.push(next);
        }
      }
      return [];
    };
    const updateSelectedPath = (group) => {
      clearSelectedPath();
      if (!group) return;
      const definition = group.userData.definition;
      if (!definition) return;
      if (currentVirtualLocation === definition.name) return;
      const destination = locationExits.get(definition.name) || [group.position.x, group.position.z];
      const waypoints = [[virtualPosition.x, virtualPosition.z]];
      const steps = findCampusRoute(currentVirtualLocation, definition.name);
      steps.forEach(({ route, forward }) => {
        const points = forward ? route.points : [...route.points].reverse();
        points.forEach((point) => {
          const last = waypoints[waypoints.length - 1];
          if (Math.hypot(last[0] - point[0], last[1] - point[1]) > 0.3) waypoints.push(point);
        });
      });
      const last = waypoints[waypoints.length - 1];
      if (Math.hypot(last[0] - destination[0], last[1] - destination[1]) > 0.3) waypoints.push(destination);
      if (waypoints.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(waypoints.map(([x, z]) => new THREE.Vector3(x, 0.42, z)));
      const guidanceMaterial = makeMaterial("#f3d38a", {
        emissive: "#bb8030",
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.8,
      });
      selectedPath = makeMesh(new THREE.TubeGeometry(curve, 42, 0.16, 6, false), guidanceMaterial, ground, [0, 0, 0], false);
      const particlePositions = new Float32Array(8 * 3);
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      selectedParticles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
        color: "#f6dda0",
        size: 0.8,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }));
      selectedParticles.frustumCulled = false;
      selectedParticles.userData.curve = curve;
      scene.add(selectedParticles);
    };
    const locationForGroup = (group) => group && group.userData.location;
    const clearBuildingHighlight = (group) => {
      (group.userData.highlightedMeshes || []).forEach(({ mesh, original, highlighted }) => {
        mesh.material = original;
        highlighted.dispose();
      });
      group.userData.highlightedMeshes = [];
    };
    const applyBuildingHighlight = (group, color, intensity) => {
      clearBuildingHighlight(group);
      if (!color) return;
      group.traverse((object) => {
        if (!object.isMesh || object.userData.questMarker || object.userData.ignoreBuildingHighlight) return;
        const original = object.material;
        if (!original?.emissive) return;
        const highlighted = original.clone();
        highlighted.emissive.set(color);
        highlighted.emissiveIntensity = Math.max(original.emissiveIntensity || 0, intensity);
        object.material = highlighted;
        group.userData.highlightedMeshes.push({ mesh: object, original, highlighted });
      });
    };
    const updateBuildingHighlights = () => {
      locationObjects.forEach((group) => {
        const selected = group === selectedGroup;
        const hovered = group === hoveredGroup;
        group.userData.glowRing.visible = selected || hovered;
        group.userData.glowRing.material = selected ? materials.gold : materials.purple;
        group.scale.setScalar(selected ? 1.025 : hovered ? 1.012 : 1);
        applyBuildingHighlight(group, selected ? "#d4af37" : hovered ? "#a78bfa" : null, selected ? 0.24 : 0.14);
      });
    };
    const focusOnGroup = (group) => {
      if (!group) return;
      const destination = group.getWorldPosition(new THREE.Vector3());
      destination.y = Math.max(1.5, controls.target.y);
      const from = controls.target.clone();
      const to = from.clone().lerp(destination, 0.24);
      const offset = to.clone().sub(from);
      if (offset.length() > 8) to.copy(from).add(offset.setLength(8));
      focusAnimation = { from, to, startedAt: clock.elapsedTime };
    };
    const setHovered = (group, x, y) => {
      if (hoveredGroup === group) {
        updateTooltip(group, x, y);
        return;
      }
      if (hoveredGroup && hoveredGroup !== selectedGroup) {
        hoveredGroup = null;
      }
      hoveredGroup = group;
      if (hoveredGroup) {
        updateBuildingHighlights();
        onHover?.(locationForGroup(hoveredGroup));
        updateTooltip(hoveredGroup, x, y);
      } else {
        updateBuildingHighlights();
        onHover?.(null);
        updateTooltip(null);
      }
    };
    const intersectGroup = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      for (const hit of hits) {
        const group = hit.object.userData.locationGroup || hit.object.userData.amenityGroup;
        if (group && (group.userData.location || group.userData.amenity)) return group;
      }
      return null;
    };
    const selectGroup = (group) => {
      if (selectedGroup === group) {
        if (group) {
          updateTooltip(group);
          if (group.userData.amenity) onAmenitySelect?.(group.userData.amenity);
        }
        return;
      }
      selectedGroup = group;
      focusAnimation = null;
      updateBuildingHighlights();
      const location = locationForGroup(group);
      updateSelectedPath(group);
      updateTooltip(group);
      focusOnGroup(group);
      if (group?.userData.amenity) {
        onAmenitySelect?.(group.userData.amenity);
        return;
      }
      onSelect?.(location || null);
      onAmenitySelect?.(null);
    };
    const onPointerMove = (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
      const group = intersectGroup(event);
      setHovered(group, event.clientX, event.clientY);
      renderer.domElement.style.cursor = group ? "pointer" : "grab";
    };
    let pointerDown = null;
    const onPointerDown = (event) => {
      pointerDown = { x: event.clientX, y: event.clientY, button: event.button };
    };
    const onPointerUp = (event) => {
      if (!pointerDown || pointerDown.button !== 0) {
        pointerDown = null;
        return;
      }
      const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      pointerDown = null;
      if (moved > 5) return;
      const group = intersectGroup(event);
      selectGroup(group);
    };
    const onPointerLeave = () => {
      setHovered(null);
      lastPointer = null;
    };
    const onControlStart = () => { focusAnimation = null; };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const setLocations = (items) => {
      const byName = new Map(items.map((item) => [item.name, item]));
      locationObjects.forEach((group) => {
        const location = byName.get(group.userData.definition.name);
        group.userData.location = location || null;
        group.traverse((child) => {
          if (child.isMesh || child.isSprite) child.userData.location = location || null;
        });
        const completed = location?.quests?.length && location.quests.every((quest) => quest.status === "completed");
        const available = location?.quests?.some((quest) => quest.status !== "completed");
        const markerColor = location?.locked ? materials.locked : location?.special_activity ? materials.gold : completed ? materials.green : available ? materials.gold : location?.explored ? materials.explored : materials.purple;
        group.userData.markerMesh.material = markerColor;
        group.userData.markerHalo.material = markerColor;
        group.userData.glowRing.material = location?.explored ? materials.green : materials.gold;
        const symbol = location?.locked ? "LOCK" : location?.special_activity ? "★" : completed ? "✓" : available ? "✦" : location?.explored ? "✓" : "?";
        const badge = group.userData.marker.children.find((child) => child.isSprite);
        if (badge?.material?.map?.image) {
          const texture = badge.material.map;
          const ctx = texture.image.getContext?.("2d");
          if (ctx) {
            const canvasHeight = texture.image.height;
            const inset = texture.image.width * 0.012;
            ctx.clearRect(0, 0, texture.image.width, texture.image.height);
            ctx.fillStyle = "rgba(20, 20, 36, 0.88)";
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(inset, inset, texture.image.width - inset * 2, canvasHeight - inset * 2, canvasHeight * 0.2);
            else ctx.rect(inset, inset, texture.image.width - inset * 2, canvasHeight - inset * 2);
            ctx.fill();
            ctx.font = `700 ${Math.max(18, Math.round(texture.image.width * 0.085))}px Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#fff0cb";
            ctx.fillText(symbol, texture.image.width / 2, canvasHeight / 2, texture.image.width - inset * 4);
            texture.needsUpdate = true;
          }
        }
        group.visible = true;
      });
      if (selectedGroup && !selectedGroup.userData.location) selectGroup(null);
    };
    const selectLocation = (location) => {
      if (!location) {
        selectGroup(null);
        return;
      }
      const group = locationGroups.get(location.name);
      if (group) selectGroup(group);
    };
    const movePlayerTo = (location) => {
      const group = locationGroups.get(location.name);
      if (!group) return;
      playerFrom.copy(player.position);
      const exit = locationExits.get(location.name) || [group.position.x, group.position.z + 3.5];
      playerTarget.set(exit[0], 0.2, exit[1]);
      playerMoveStart = clock.elapsedTime;
      playerMoving = true;
      pendingVirtualLocation = location.name;
    };
    const zoomBy = (direction) => {
      const offset = camera.position.clone().sub(controls.target);
      const factor = direction > 0 ? 1 / 1.16 : 1.16;
      const distance = THREE.MathUtils.clamp(cameraDistance() * factor, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
      updateZoomLabel();
    };
    const onControlChange = () => {
      updateZoomLabel();
      updateFog(cameraDistance());
    };
    controls.addEventListener("start", onControlStart);
    controls.addEventListener("change", onControlChange);

    let lastFrameElapsed = 0;
    const render = () => {
      if (disposed) return;
      animationFrame = window.requestAnimationFrame(render);
      const elapsed = clock.getElapsedTime();
      const delta = Math.min(0.05, Math.max(0, elapsed - lastFrameElapsed));
      lastFrameElapsed = elapsed;
      controls.update();
      updatePedestrians(elapsed, delta);
      if (focusAnimation) {
        const progress = Math.min(1, (elapsed - focusAnimation.startedAt) / 0.32);
        const eased = progress * progress * (3 - 2 * progress);
        const desiredTarget = focusAnimation.from.clone().lerp(focusAnimation.to, eased);
        const movement = desiredTarget.sub(controls.target);
        camera.position.add(movement);
        controls.target.add(movement);
        if (progress >= 1) focusAnimation = null;
      }
      locationObjects.forEach((group, index) => {
        const marker = group.userData.marker;
        marker.position.y = (group.userData.definition.kind === "tower" ? 16.5 : 6.9) + (reducedMotion ? 0 : Math.sin(elapsed * 1.7 + index) * 0.13);
        marker.rotation.y = reducedMotion ? 0 : elapsed * 0.52;
      });
      player.position.y = playerMoving && !reducedMotion ? 0.2 + Math.sin(Math.min(1, (elapsed - playerMoveStart) / 0.7) * Math.PI) * 1.4 : 0.2 + (reducedMotion ? 0 : Math.sin(elapsed * 2.1) * 0.06);
      if (playerMoving) {
        const progress = reducedMotion ? 1 : Math.min(1, (elapsed - playerMoveStart) / 0.72);
        const smooth = progress * progress * (3 - 2 * progress);
        player.position.x = THREE.MathUtils.lerp(playerFrom.x, playerTarget.x, smooth);
        player.position.z = THREE.MathUtils.lerp(playerFrom.z, playerTarget.z, smooth);
        if (progress >= 1) {
          playerMoving = false;
          virtualPosition = { x: player.position.x, z: player.position.z };
          currentVirtualLocation = pendingVirtualLocation || currentVirtualLocation;
          pendingVirtualLocation = null;
          updateSelectedPath(selectedGroup);
        }
      }
      playerHalo.material.opacity = 0.55 + Math.sin(elapsed * 2.5) * 0.2;
      if (selectedParticles) {
        const positions = selectedParticles.geometry.attributes.position.array;
        const curve = selectedParticles.userData.curve;
        for (let index = 0; index < positions.length / 3; index += 1) {
          const t = (elapsed * 0.18 + index / (positions.length / 3)) % 1;
          const point = curve.getPoint(t);
          positions[index * 3] = point.x;
          positions[index * 3 + 1] = point.y + 0.08;
          positions[index * 3 + 2] = point.z;
        }
        selectedParticles.geometry.attributes.position.needsUpdate = true;
      }
      if (hoveredGroup && lastPointer) updateTooltip(hoveredGroup, lastPointer.x, lastPointer.y);
      renderer.render(scene, camera);
    };

    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => resize(true)) : null;
    resizeObserver?.observe(container);
    window.addEventListener("resize", () => resize(true));
    resize(false);
    fitCampusToView();
    render();

    return {
      setLocations,
      selectLocation,
      movePlayerTo,
      zoomBy,
      fitCampusToView,
      setTopView: () => focusView(15 * DEG, 0),
      setIsometric: () => {
        controls.target.set(0, 0, 0);
        focusView(42 * DEG, 45 * DEG);
      },
      resize: () => resize(true),
      dispose: () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        resizeObserver?.disconnect();
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
        controls.removeEventListener("change", onControlChange);
        controls.removeEventListener("start", onControlStart);
        controls.dispose();
        renderer.dispose();
        container.removeChild(renderer.domElement);
      },
    };
  };

  window.CampusWorld = { create: createCampusWorld };
})();
