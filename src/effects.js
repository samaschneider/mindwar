import * as THREE from "three";

const TRACER_POOL = 80;
const PARTICLE_COUNT = 420;
const FLASH_POOL = 24;

function makeFlashTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,235,1)");
  g.addColorStop(0.3, "rgba(255,198,96,0.95)");
  g.addColorStop(0.7, "rgba(255,120,30,0.35)");
  g.addColorStop(1, "rgba(255,80,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.tracers = [];
    this.flashes = [];
    this.particles = [];
    this.time = 0;

    for (let i = 0; i < TRACER_POOL; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xffd27a, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      line.renderOrder = 4;
      scene.add(line);
      this.tracers.push({ line, life: 0, max: 0.07 });
    }

    const flashTex = makeFlashTexture();
    for (let i = 0; i < FLASH_POOL; i++) {
      const mat = new THREE.SpriteMaterial({
        map: flashTex, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.renderOrder = 5;
      scene.add(sprite);
      this.flashes.push({ sprite, life: 0, max: 0.06, size: 1 });
    }

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) positions[i * 3 + 1] = -999;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.19, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.pPositions = positions;
    this.pColors = colors;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, gravity: 8 });
    }

    this._c = new THREE.Color();
  }

  tracer(from, to, color = 0xffd27a, life = 0.07, width = 1) {
    let slot = this.tracers.find(t => t.life <= 0);
    if (!slot) slot = this.tracers[0];
    const arr = slot.line.geometry.attributes.position.array;
    arr[0] = from.x; arr[1] = from.y; arr[2] = from.z;
    arr[3] = to.x; arr[4] = to.y; arr[5] = to.z;
    slot.line.geometry.attributes.position.needsUpdate = true;
    slot.line.material.color.setHex(color);
    slot.line.material.opacity = 0.95;
    slot.line.visible = true;
    slot.life = life;
    slot.max = life;
  }

  muzzle(pos, color = 0xffc45e, size = 1) {
    let slot = this.flashes.find(f => f.life <= 0);
    if (!slot) slot = this.flashes[0];
    slot.sprite.position.copy(pos);
    slot.sprite.material.color.setHex(color);
    slot.sprite.material.opacity = 1;
    slot.sprite.scale.setScalar(size);
    slot.sprite.visible = true;
    slot.life = 0.055;
    slot.max = 0.055;
    slot.size = size;
  }

  burst(pos, color = 0xffc45e, count = 8, speed = 4, gravity = 9) {
    const c = this._c.setHex(color);
    for (let i = 0; i < count; i++) {
      const p = this.particles.find(p => p.life <= 0);
      if (!p) return;
      const idx = this.particles.indexOf(p);
      p.life = 0.25 + Math.random() * 0.45;
      p.max = p.life;
      p.x = pos.x; p.y = pos.y; p.z = pos.z;
      const a = Math.random() * Math.PI * 2;
      const up = (Math.random() - 0.2) * 1.2;
      const s = speed * (0.35 + Math.random() * 0.8);
      p.vx = Math.cos(a) * s;
      p.vy = up * s;
      p.vz = Math.sin(a) * s;
      p.gravity = gravity;
      this.pPositions[idx * 3] = p.x;
      this.pPositions[idx * 3 + 1] = p.y;
      this.pPositions[idx * 3 + 2] = p.z;
      const f = 0.75 + Math.random() * 0.5;
      this.pColors[idx * 3] = c.r * f;
      this.pColors[idx * 3 + 1] = c.g * f;
      this.pColors[idx * 3 + 2] = c.b * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  impact(pos, color = 0xd8c49a, count = 5) {
    this.burst(pos, color, count, 2.8, 13);
    this.muzzle(pos, 0xffd6a2, 0.45);
  }

  explosion(pos, scale = 1) {
    this.burst(pos, 0xff8b32, Math.round(22 * scale), 7 * scale, 9);
    this.burst(pos, 0xffdd7a, Math.round(12 * scale), 4 * scale, 12);
    this.burst(pos, 0x7a3f8f, Math.round(8 * scale), 5 * scale, 6);
    this.muzzle(pos, 0xffb55a, 6 * scale);
  }

  update(dt) {
    this.time += dt;
    for (const t of this.tracers) {
      if (t.life > 0) {
        t.life -= dt;
        t.line.material.opacity = Math.max(0, t.life / t.max) * 0.95;
        if (t.life <= 0) t.line.visible = false;
      }
    }
    for (const f of this.flashes) {
      if (f.life > 0) {
        f.life -= dt;
        f.sprite.material.opacity = Math.max(0, f.life / f.max);
        if (f.life <= 0) f.sprite.visible = false;
      }
    }
    let dirty = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
        this.pPositions[i * 3] = p.x;
        this.pPositions[i * 3 + 1] = p.y;
        this.pPositions[i * 3 + 2] = p.z;
        const fade = Math.max(0, p.life / p.max);
        this.pColors[i * 3] *= 0.985;
        this.pColors[i * 3 + 1] *= 0.985;
        this.pColors[i * 3 + 2] *= 0.985;
        if (p.life <= 0) this.pPositions[i * 3 + 1] = -999;
        dirty = true;
        void fade;
      }
    }
    if (dirty) {
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
  }
}
