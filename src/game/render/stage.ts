import * as THREE from "three";

// A night-time castle rooftop, painted procedurally onto canvases so the game
// ships without any image assets.

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function backdropTexture() {
  const [c, g] = canvas(2048, 768);
  const rand = seeded(7);

  const sky = g.createLinearGradient(0, 0, 0, 768);
  sky.addColorStop(0, "#070b24");
  sky.addColorStop(0.55, "#1c2257");
  sky.addColorStop(0.85, "#4a2d5e");
  sky.addColorStop(1, "#6b3a4f");
  g.fillStyle = sky;
  g.fillRect(0, 0, 2048, 768);

  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,240,${0.3 + rand() * 0.7})`;
    const size = rand() < 0.1 ? 3 : 1.6;
    g.fillRect(rand() * 2048, rand() * 420, size, size);
  }

  // Moon with a soft halo.
  const halo = g.createRadialGradient(1500, 170, 40, 1500, 170, 220);
  halo.addColorStop(0, "rgba(255,240,200,0.45)");
  halo.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = halo;
  g.fillRect(1250, 0, 500, 420);
  g.fillStyle = "#fff4d6";
  g.beginPath();
  g.arc(1500, 170, 70, 0, Math.PI * 2);
  g.fill();

  // Distant mountains.
  g.fillStyle = "#24193d";
  g.beginPath();
  g.moveTo(0, 600);
  for (let x = 0; x <= 2048; x += 64) g.lineTo(x, 470 + Math.sin(x * 0.004) * 60 + rand() * 30);
  g.lineTo(2048, 768);
  g.lineTo(0, 768);
  g.fill();

  // Pagoda silhouettes.
  const pagoda = (cx: number, base: number, scale: number, color: string) => {
    g.fillStyle = color;
    let w = 260 * scale;
    let y = base;
    for (let tier = 0; tier < 4; tier++) {
      const h = 46 * scale;
      g.fillRect(cx - w * 0.32, y - h, w * 0.64, h);
      g.beginPath();
      g.moveTo(cx - w * 0.62, y - h + 6 * scale);
      g.quadraticCurveTo(cx - w * 0.3, y - h - 4 * scale, cx - w * 0.18, y - h - 34 * scale);
      g.lineTo(cx + w * 0.18, y - h - 34 * scale);
      g.quadraticCurveTo(cx + w * 0.3, y - h - 4 * scale, cx + w * 0.62, y - h + 6 * scale);
      g.fill();
      y -= h + 30 * scale;
      w *= 0.78;
    }
    g.fillRect(cx - 4 * scale, y - 60 * scale, 8 * scale, 70 * scale);
    // Lit windows.
    g.fillStyle = "rgba(255,190,90,0.85)";
    for (let i = 0; i < 6; i++) g.fillRect(cx - 50 * scale + i * 18 * scale, base - 30 * scale, 8 * scale, 12 * scale);
  };
  pagoda(520, 700, 1.25, "#120c1f");
  pagoda(1180, 700, 0.8, "#18102a");
  pagoda(1820, 700, 1.0, "#140d23");

  g.fillStyle = "#0d0816";
  g.fillRect(0, 690, 2048, 78);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function floorTexture() {
  const [c, g] = canvas(512, 512);
  const rand = seeded(3);
  const plank = 64;
  for (let row = 0; row < 512 / plank; row++) {
    const shade = 120 + Math.floor(rand() * 40);
    g.fillStyle = `rgb(${shade},${Math.floor(shade * 0.62)},${Math.floor(shade * 0.36)})`;
    g.fillRect(0, row * plank, 512, plank);
    for (let i = 0; i < 18; i++) {
      g.strokeStyle = `rgba(60,30,10,${0.15 + rand() * 0.2})`;
      g.beginPath();
      const y = row * plank + rand() * plank;
      g.moveTo(0, y);
      g.bezierCurveTo(170, y + rand() * 6 - 3, 340, y + rand() * 6 - 3, 512, y);
      g.stroke();
    }
    g.fillStyle = "rgba(30,15,5,0.8)";
    g.fillRect(0, row * plank, 512, 3);
    const joint = rand() * 512;
    g.fillRect(joint, row * plank, 3, plank);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.anisotropy = 4;
  return tex;
}

export function buildStage(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x070b24);
  scene.fog = new THREE.Fog(0x1c1838, 14, 34);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 24),
    new THREE.MeshBasicMaterial({ map: backdropTexture(), fog: false }),
  );
  backdrop.position.set(0, 7, -16);
  scene.add(backdrop);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 12),
    new THREE.MeshLambertMaterial({ map: floorTexture() }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -2;
  scene.add(floor);

  // Wooden railing along the back edge of the roof.
  const wood = new THREE.MeshLambertMaterial({ color: 0x5a2a14 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(40, 0.12, 0.12), wood);
  rail.position.set(0, 1.0, -5.5);
  scene.add(rail);
  const lowRail = rail.clone();
  lowRail.position.y = 0.5;
  scene.add(lowRail);
  const postGeo = new THREE.BoxGeometry(0.2, 1.3, 0.2);
  for (let x = -18; x <= 18; x += 2.4) {
    const post = new THREE.Mesh(postGeo, wood);
    post.position.set(x, 0.65, -5.5);
    scene.add(post);
  }

  // Warm light from off-screen lanterns at either end of the roof.
  for (const x of [-7.2, 7.2]) {
    const light = new THREE.PointLight(0xff9a40, 6, 7, 1.5);
    light.position.set(x, 2.1, -4.8);
    scene.add(light);
  }

  scene.add(new THREE.HemisphereLight(0x8c9cff, 0x3a2010, 1.4));
  const moon = new THREE.DirectionalLight(0xfff0dd, 2.2);
  moon.position.set(-3, 6, 8);
  scene.add(moon);
}
