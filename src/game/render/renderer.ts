import * as THREE from "three";
import { STAGE_HALF } from "../constants";
import type { Match, MatchEvent, Projectile } from "../match";
import { FighterRig } from "./rig";
import { buildStage } from "./stage";

const VIEW_WIDTH = 8.6;
const CAMERA_FOV = 30;

interface Spark {
  group: THREE.Group;
  age: number;
  life: number;
}

interface Fireball {
  group: THREE.Group;
  ring: THREE.Mesh;
  light: THREE.PointLight;
}

const sparkGeo = new THREE.PlaneGeometry(0.5, 0.07);
const SPARK_COLORS: Record<MatchEvent["kind"], number> = { hit: 0xfff2a0, block: 0x9fd8ff, clash: 0xffb060 };

/** Owns the three.js scene and draws the current state of a Match. */
export class GameRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private rigs: FighterRig[];
  private fireballs = new Map<Projectile, Fireball>();
  private sparks: Spark[] = [];
  private camX = 0;
  private time = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly match: Match,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.1, 100);
    buildStage(this.scene);

    this.rigs = match.fighters.map((f) => {
      const rig = new FighterRig(f.colors, f.def.id === "ken");
      this.scene.add(rig.root);
      this.scene.add(rig.shadowMesh);
      return rig;
    });

    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(dt: number) {
    this.time += dt;
    const m = this.match;
    m.fighters.forEach((f, i) => this.rigs[i].update(f, this.time));

    this.syncFireballs();
    for (const e of m.events) this.addSpark(e);
    m.events.length = 0;
    this.updateSparks();

    // Track the midpoint of the fighters, framing a fixed width of stage.
    const [a, b] = m.fighters;
    const mid = (a.x + b.x) / 2;
    const halfView = VIEW_WIDTH / 2;
    const maxX = Math.max(0, STAGE_HALF + 0.4 - halfView);
    this.camX += (Math.max(-maxX, Math.min(maxX, mid)) - this.camX) * 0.2;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const dist = VIEW_WIDTH / 2 / (tanHalf * this.camera.aspect);
    const lift = Math.max(a.y, b.y) * 0.25;
    const shake = m.shake > 0 ? (Math.random() - 0.5) * m.shake * 0.012 : 0;
    this.camera.position.set(this.camX + shake, 1.75 + lift + shake, dist);
    this.camera.lookAt(this.camX, 1.3 + lift, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private syncFireballs() {
    const live = new Set(this.match.projectiles);
    for (const [p, fb] of this.fireballs) {
      if (!live.has(p)) {
        this.scene.remove(fb.group);
        fb.group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
        fb.light.dispose();
        this.fireballs.delete(p);
      }
    }
    for (const p of this.match.projectiles) {
      let fb = this.fireballs.get(p);
      if (!fb) {
        fb = this.makeFireball();
        this.fireballs.set(p, fb);
        this.scene.add(fb.group);
      }
      fb.group.position.set(p.x, p.y, 0.1);
      fb.group.scale.x = p.vx > 0 ? 1 : -1;
      fb.ring.rotation.x = p.age * 0.35;
      const pulse = 1 + Math.sin(p.age * 0.8) * 0.08;
      fb.group.scale.y = pulse;
      fb.group.scale.z = pulse;
    }
  }

  private makeFireball(): Fireball {
    const group = new THREE.Group();
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x3a8cff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    glow.scale.set(1.5, 1, 1);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: 0xe8f6ff }));
    core.position.x = 0.08;
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.8, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x1f5fff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.42;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.03, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    ring.rotation.y = Math.PI / 2;
    const light = new THREE.PointLight(0x4a9cff, 8, 5, 1.5);
    group.add(glow, core, tail, ring, light);
    return { group, ring, light };
  }

  private addSpark(e: MatchEvent) {
    const group = new THREE.Group();
    const count = e.heavy ? 9 : 6;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        sparkGeo,
        new THREE.MeshBasicMaterial({ color: SPARK_COLORS[e.kind], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      mesh.rotation.z = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      mesh.position.set(Math.cos(mesh.rotation.z) * 0.15, Math.sin(mesh.rotation.z) * 0.15, 0);
      group.add(mesh);
    }
    const flash = new THREE.Mesh(
      new THREE.CircleGeometry(e.heavy ? 0.22 : 0.15, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    group.add(flash);
    group.position.set(e.x, e.y, 0.4);
    this.scene.add(group);
    this.sparks.push({ group, age: 0, life: e.heavy ? 14 : 10 });
  }

  private updateSparks() {
    this.sparks = this.sparks.filter((s) => {
      s.age++;
      const t = s.age / s.life;
      s.group.scale.setScalar(0.6 + t * 1.4);
      s.group.children.forEach((c) => {
        ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - t;
      });
      if (t >= 1) {
        this.scene.remove(s.group);
        s.group.children.forEach((c) => {
          const mesh = c as THREE.Mesh;
          (mesh.material as THREE.Material).dispose();
          if (mesh.geometry !== sparkGeo) mesh.geometry.dispose();
        });
        return false;
      }
      return true;
    });
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        if (o.geometry !== sparkGeo) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) {
          (mat as THREE.MeshBasicMaterial).map?.dispose();
          mat.dispose();
        }
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
