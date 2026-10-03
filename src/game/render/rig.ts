import * as THREE from "three";
import type { Fighter } from "../fighter";
import { poseFor } from "../poses";
import type { FighterColors } from "../types";

const THIGH = 0.46;
const SHIN = 0.44;
const FOOT_H = 0.07;
const UPPER_ARM = 0.3;
const FOREARM = 0.27;
/** Turn the body toward the camera for an arcade-style three-quarter view. */
const THREE_QUARTER = -0.45;

let toonRamp: THREE.DataTexture | null = null;
function gradientMap() {
  if (!toonRamp) {
    toonRamp = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    toonRamp.minFilter = THREE.NearestFilter;
    toonRamp.magFilter = THREE.NearestFilter;
    toonRamp.needsUpdate = true;
  }
  return toonRamp;
}

const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x120a08, side: THREE.BackSide });

function part(geometry: THREE.BufferGeometry, material: THREE.Material, outline = 1.1) {
  const mesh = new THREE.Mesh(geometry, material);
  const edge = new THREE.Mesh(geometry, outlineMaterial);
  edge.scale.setScalar(outline);
  mesh.add(edge);
  return mesh;
}

/** A limb segment hanging down from its pivot, with a joint at its end. */
function segment(length: number, radius: number, material: THREE.Material) {
  const pivot = new THREE.Group();
  const mesh = part(new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius), 4, 10), material, 1.12);
  mesh.position.y = -length / 2;
  pivot.add(mesh);
  const end = new THREE.Group();
  end.position.y = -length;
  pivot.add(end);
  return { pivot, end };
}

/** A procedural low-poly karate fighter, posed every frame from the simulation. */
export class FighterRig {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private joints: Record<"lSh" | "lEl" | "rSh" | "rEl" | "lHip" | "lKnee" | "rHip" | "rKnee", THREE.Group>;
  private shadow: THREE.Mesh;
  private headbandTails: THREE.Group | null = null;

  constructor(colors: FighterColors, longHair: boolean) {
    const mat = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
    const gi = mat(colors.gi);
    const giShade = mat(colors.giShade);
    const skin = mat(colors.skin);
    const belt = mat(colors.belt);
    const hair = mat(colors.hair);
    const gloves = mat(colors.gloves);

    this.root.add(this.body);
    this.body.rotation.y = THREE_QUARTER;
    this.body.add(this.hips);

    // Pelvis and belt.
    const pelvis = part(new THREE.BoxGeometry(0.3, 0.2, 0.32), gi);
    pelvis.position.y = 0.02;
    this.hips.add(pelvis);
    const beltMesh = part(new THREE.BoxGeometry(0.33, 0.07, 0.35), belt, 1.05);
    beltMesh.position.y = 0.12;
    this.hips.add(beltMesh);
    const beltTail = part(new THREE.BoxGeometry(0.04, 0.2, 0.05), belt, 1.1);
    beltTail.position.set(0.17, 0.03, 0.06);
    beltTail.rotation.z = 0.15;
    this.hips.add(beltTail);

    // Torso: gi top open at the chest.
    this.torso.position.y = 0.14;
    this.hips.add(this.torso);
    const chest = part(new THREE.CapsuleGeometry(0.17, 0.26, 4, 12), gi, 1.06);
    chest.scale.set(0.95, 1, 1.25);
    chest.position.y = 0.26;
    this.torso.add(chest);
    const skinV = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.1, 0.24, 3), skin);
    skinV.rotation.z = Math.PI;
    skinV.rotation.y = Math.PI / 2;
    skinV.position.set(0.14, 0.4, 0);
    skinV.scale.set(1, 1, 0.5);
    this.torso.add(skinV);
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.04), giShade);
    lapel.position.set(0.16, 0.3, 0.03);
    lapel.rotation.x = 0.35;
    this.torso.add(lapel);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8), skin);
    neck.position.y = 0.55;
    this.torso.add(neck);

    // Head with hair and (for Ryu) a headband.
    this.head.position.y = 0.6;
    this.torso.add(this.head);
    const skull = part(new THREE.SphereGeometry(0.115, 14, 12), skin, 1.08);
    skull.scale.set(1, 1.12, 0.95);
    skull.position.y = 0.1;
    this.head.add(skull);
    const hairCap = part(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 1.05);
    hairCap.position.set(-0.015, 0.13, 0);
    hairCap.rotation.z = 0.35;
    hairCap.scale.set(1.05, longHair ? 1.15 : 1, 1.0);
    this.head.add(hairCap);
    if (longHair) {
      const mane = part(new THREE.SphereGeometry(0.1, 10, 8), hair, 1.05);
      mane.position.set(-0.08, 0.05, 0);
      mane.scale.set(0.9, 1.3, 1.1);
      this.head.add(mane);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1010 });
    for (const z of [-0.04, 0.04]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.025), eyeMat);
      eye.position.set(0.105, 0.12, z);
      this.head.add(eye);
    }
    if (colors.headband !== undefined) {
      const bandMat = mat(colors.headband);
      const band = part(new THREE.TorusGeometry(0.12, 0.022, 6, 18), bandMat, 1.05);
      band.rotation.x = Math.PI / 2;
      band.rotation.y = 0.2;
      band.position.y = 0.16;
      this.head.add(band);
      this.headbandTails = new THREE.Group();
      this.headbandTails.position.set(-0.12, 0.15, 0);
      for (const [z, rz] of [[-0.02, 0.4], [0.02, 0.15]] as const) {
        const tail = part(new THREE.BoxGeometry(0.22, 0.035, 0.012), bandMat, 1.1);
        tail.geometry.translate(-0.11, 0, 0);
        tail.position.z = z;
        tail.rotation.z = rz;
        this.headbandTails.add(tail);
      }
      this.head.add(this.headbandTails);
    }

    // Arms: bare skin with gi sleeve stumps and gloves.
    const arm = (z: number) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0, 0.46, z);
      this.torso.add(shoulder);
      const sleeve = part(new THREE.SphereGeometry(0.085, 10, 8), gi, 1.08);
      sleeve.position.y = -0.03;
      shoulder.add(sleeve);
      const upper = segment(UPPER_ARM, 0.06, skin);
      shoulder.add(upper.pivot);
      const fore = segment(FOREARM, 0.052, skin);
      upper.end.add(fore.pivot);
      const fist = part(new THREE.BoxGeometry(0.1, 0.11, 0.1), gloves, 1.08);
      fist.position.y = -0.03;
      fore.end.add(fist);
      return { shoulder: upper.pivot, elbow: fore.pivot };
    };
    const lead = arm(-0.22);
    const rear = arm(0.22);

    // Legs: baggy gi trousers and bare feet.
    const leg = (z: number) => {
      const thigh = segment(THIGH, 0.095, gi);
      thigh.pivot.position.set(0, 0, z);
      this.hips.add(thigh.pivot);
      const shin = segment(SHIN, 0.088, giShade);
      thigh.end.add(shin.pivot);
      const foot = part(new THREE.BoxGeometry(0.2, FOOT_H, 0.1), skin, 1.08);
      foot.position.set(0.05, -FOOT_H / 2 + 0.01, 0);
      shin.end.add(foot);
      return { hip: thigh.pivot, knee: shin.pivot };
    };
    const lLeg = leg(-0.1);
    const rLeg = leg(0.1);

    this.joints = {
      lSh: lead.shoulder,
      lEl: lead.elbow,
      rSh: rear.shoulder,
      rEl: rear.elbow,
      lHip: lLeg.hip,
      lKnee: lLeg.knee,
      rHip: rLeg.hip,
      rKnee: rLeg.knee,
    };

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.005;
    this.shadow.scale.set(1, 0.5, 1);
  }

  /** The shadow lives in the scene, not the rig, so it stays on the floor. */
  get shadowMesh() {
    return this.shadow;
  }

  update(f: Fighter, time: number) {
    const p = poseFor(f, time);
    const j = this.joints;
    j.lSh.rotation.z = p.lSh;
    j.lEl.rotation.z = p.lEl;
    j.rSh.rotation.z = p.rSh;
    j.rEl.rotation.z = p.rEl;
    j.lHip.rotation.z = p.lHip;
    j.lKnee.rotation.z = p.lKnee;
    j.rHip.rotation.z = p.rHip;
    j.rKnee.rotation.z = p.rKnee;
    this.torso.rotation.z = p.lean;
    this.head.rotation.z = p.head;
    this.hips.rotation.z = p.bodyRot;
    this.body.rotation.y = THREE_QUARTER + p.spin;

    const drop = (hip: number, knee: number) => THIGH * Math.cos(hip) + SHIN * Math.cos(hip + knee) + FOOT_H;
    const planted = Math.max(drop(p.lHip, p.lKnee), drop(p.rHip, p.rKnee));
    this.hips.position.y = planted * p.plant + p.hipY * (1 - p.plant);

    if (this.headbandTails) {
      this.headbandTails.rotation.z = Math.sin(time * 9 + f.index) * 0.18 - p.lean * 0.5;
    }

    this.root.position.set(f.x, f.y, 0);
    this.root.scale.x = f.facing;
    // Draw the defender slightly behind so overlapping limbs read clearly.
    this.root.position.z = f.state === "attack" ? 0.05 : 0;

    const h = Math.min(1.5, f.y);
    this.shadow.position.x = f.x;
    this.shadow.scale.set(1 - h * 0.35, 0.5 - h * 0.17, 1);
  }
}
