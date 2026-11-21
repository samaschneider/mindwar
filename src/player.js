import * as THREE from "three";
import { WeaponSystem } from "./weapons.js";

const BASE_FOV = 78;
const EYE = 1.62;
const RADIUS = 0.32;
const HEIGHT = 1.76;
const GRAVITY = 25;
const JUMP = 8.7;

export class Player {
  constructor({ camera, scene, world, enemies, effects, audio, hud, onDeath }) {
    this.camera = camera;
    this.scene = scene;
    this.world = world;
    this.enemies = enemies;
    this.effects = effects;
    this.audio = audio;
    this.hud = hud;
    this.onDeath = onDeath;

    this.pos = new THREE.Vector3(0, 20, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.recoil = 0;
    this.shake = 0;
    this.health = 1000;
    this.dead = false;
    this.grounded = false;
    this.stepPhase = 0;
    this.stepTimer = 0;
    this.ads = false;
    this.fov = BASE_FOV;
    this.stepped = false;
    this.promptTimer = 0;
    this.externalPrompt = null;
    this.time = 0;
    this.spawnPoint = new THREE.Vector3(0, 20, 0);
    this.spawnYaw = 0;
    this.totalDamageTaken = 0;

    camera.rotation.order = "YXZ";
    this.weapons = new WeaponSystem({
      camera, scene, player: this, world, enemies, effects, audio, hud
    });
    this.lookSensitivity = 0.0021;
  }

  spawn(x, z, yaw = 0) {
    const y = this.world.surfaceY(x, z);
    this.pos.set(x, y, z);
    this.spawnPoint.set(x, y, z);
    this.spawnYaw = yaw;
    this.yaw = yaw;
    this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.health = 1000;
    this.dead = false;
    this.grounded = this.supported();
    this.recoil = 0;
    this.shake = 0;
    this.weapons.refillMags();
    this.weapons.switchTo(0);
    this.updateCamera(0);
  }

  look(dx, dy) {
    if (this.dead) return;
    // Zoomed optics get proportionally slower aiming, so the sight stays usable.
    const fovScale = Math.max(0.22, Math.min(1, this.fov / BASE_FOV));
    const sens = this.lookSensitivity * fovScale;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.42);
    this.weapons.addLook(dx, dy);
  }

  addRecoil(amount) {
    this.recoil += amount * 2.3;
    this.shake = Math.max(this.shake, amount * 2.5);
  }

  addHealth(amount) {
    this.health += amount;
    this.hud.setHealth(this.health);
  }

  damage(amount, source) {
    if (this.dead) return;
    this.health -= amount;
    this.totalDamageTaken += amount;
    this.shake = Math.min(0.32, this.shake + amount * 0.006);
    this.hud.damageFlash(amount);
    this.hud.setHealth(this.health);
    this.audio.hurt();
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.audio.hurt();
      this.onDeath?.(source);
    }
    void source;
  }

  update(dt, input) {
    if (this.dead) {
      this.updateCamera(dt);
      return;
    }
    this.time += dt;
    this.stepped = false;
    this.ads = !!input.ads;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    if (input.forward) wish.add(forward);
    if (input.back) wish.sub(forward);
    if (input.right) wish.add(right);
    if (input.left) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    const sprinting = input.sprint && !this.ads && (input.forward || input.back || input.left || input.right);
    const targetSpeed = this.weapons.scoped ? 2.2 : this.ads ? 3.9 : sprinting ? 10.6 : 6.4;
    const accel = this.grounded ? (wish.lengthSq() > 0 ? 14 : 12) : 2.8;
    this.vel.x += (wish.x * targetSpeed - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (wish.z * targetSpeed - this.vel.z) * Math.min(1, dt * accel);

    if (input.jump && this.grounded) {
      this.vel.y = JUMP;
      this.grounded = false;
    }

    this.moveHorizontal(this.vel.x * dt, this.vel.z * dt);

    const onLadder = this.world.isLadderAt(this.pos.x, this.pos.y + 0.2, this.pos.z) ||
      this.world.isLadderAt(this.pos.x, this.pos.y + 1.2, this.pos.z);

    if (onLadder) {
      this.grounded = false;
      const climb = input.forward || input.jump ? 1 : input.back ? -1 : 0;
      this.vel.y = climb * 5.2;
      if (climb !== 0) {
        let ny = this.pos.y + this.vel.y * dt;
        // Stop at the top rung so the player can step onto the roof instead
        // of climbing into the air above it.
        const ladderY = this.world.ladderTop(this.pos.x, this.pos.z, this.pos.y);
        if (climb > 0 && ladderY !== null) ny = Math.min(ny, ladderY);
        if (!this.collidesAt(this.pos.x, ny, this.pos.z)) this.pos.y = ny;
        else this.vel.y = 0;
      }
    } else {
      // If we are already standing on solid ground, do not keep applying gravity
      // into it. The old code re-landed every frame, which made the camera shake.
      const support = this.supported();
      if (this.grounded) {
        if (support) {
          this.vel.y = 0;
        } else {
          this.grounded = false;
        }
      }

      if (!this.grounded) {
        const wasGrounded = this.grounded;
        this.vel.y -= GRAVITY * dt;
        if (this.vel.y < -38) this.vel.y = -38;

        const ny = this.pos.y + this.vel.y * dt;
        if (this.collidesAt(this.pos.x, ny, this.pos.z)) {
          if (this.vel.y <= 0) {
            const impact = -this.vel.y;
            let y = ny;
            for (let i = 0; i < 50 && this.collidesAt(this.pos.x, y, this.pos.z); i++) y += 0.04;
            this.pos.y = y;
            this.vel.y = 0;
            this.grounded = true;
            if (!wasGrounded || impact > 5.5) {
              this.shake = Math.max(this.shake, Math.min(0.09, 0.018 + impact * 0.005));
              this.audio.footstep();
            }
          } else {
            this.vel.y = 0;
          }
        } else {
          this.pos.y = ny;
          this.grounded = false;
        }
      }

      if (!this.grounded && this.vel.y <= 0 && this.supported()) {
        this.grounded = true;
        this.vel.y = 0;
      }
    }
    if (this.pos.y < -30) this.damage(99999, null);

    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.stepPhase += dt * (3.5 + speed * 1.35);
    if (this.grounded && speed > 0.7) {
      this.stepTimer -= dt * speed;
      if (this.stepTimer <= 0) {
        this.stepTimer = 6.5;
        this.audio.footstep();
      }
    }

    this.recoil *= Math.exp(-dt * 7.5);
    this.shake *= Math.exp(-dt * 9);
    this.updateCamera(dt, speed);

    this.weapons.update(dt, input);

    const targetFov = this.ads ? (this.weapons.currentDef.adsFov || 70) : sprinting ? 84 : BASE_FOV;
    this.fov += (targetFov - this.fov) * Math.min(1, dt * 9);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    this.promptTimer -= dt;
    if (this.promptTimer <= 0) {
      this.promptTimer = 0.15;
      this.hud.setPrompt(this.externalPrompt || this.enemies.getInteractPrompt());
    }
  }

  moveHorizontal(dx, dz) {
    if (dx !== 0) {
      const nx = this.pos.x + dx;
      if (!this.collidesAt(nx, this.pos.y, this.pos.z)) {
        this.pos.x = nx;
      } else if (this.grounded && !this.stepped && this.canStep(nx, this.pos.z)) {
        this.pos.x = nx;
        this.pos.y += 1.03;
        this.stepped = true;
      } else {
        this.vel.x = 0;
      }
    }
    if (dz !== 0) {
      const nz = this.pos.z + dz;
      if (!this.collidesAt(this.pos.x, this.pos.y, nz)) {
        this.pos.z = nz;
      } else if (this.grounded && !this.stepped && this.canStep(this.pos.x, nz)) {
        this.pos.z = nz;
        this.pos.y += 1.03;
        this.stepped = true;
      } else {
        this.vel.z = 0;
      }
    }
  }

  canStep(x, z) {
    if (this.collidesAt(x, this.pos.y + 1.03, z)) return false;
    const ground = this.world.surfaceY(x, z);
    return ground <= this.pos.y + 1.15;
  }

  collidesAt(x, y, z) {
    return this.world.collidesBox(x, y + 0.02, z, RADIUS, HEIGHT);
  }

  supported() {
    const r = RADIUS * 0.7;
    for (const ox of [-r, r]) {
      for (const oz of [-r, r]) {
        if (this.world.isSolid(this.pos.x + ox, this.pos.y - 0.06, this.pos.z + oz)) return true;
      }
    }
    return false;
  }

  updateCamera(dt, speed = 0) {
    const bobAmt = this.grounded ? Math.min(1, speed / 7) : 0.15;
    const bob = Math.sin(this.stepPhase * 2) * 0.025 * bobAmt;
    const swayRoll = Math.cos(this.stepPhase) * 0.004 * bobAmt;
    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;
    this.camera.position.set(
      this.pos.x,
      this.pos.y + EYE + bob,
      this.pos.z
    );
    this.camera.rotation.set(
      this.pitch + this.recoil + shakeY,
      this.yaw + shakeX,
      swayRoll,
      "YXZ"
    );
  }

  getSaveData() {
    return {
      pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
      yaw: this.yaw,
      pitch: this.pitch,
      health: this.health,
      weapon: this.weapons.index,
      grenades: this.weapons.grenades,
      ammo: this.weapons.getAmmoState()
    };
  }

  restore(data) {
    if (!data || !data.pos) return;
    this.pos.set(data.pos.x, data.pos.y, data.pos.z);
    this.yaw = data.yaw || 0;
    this.pitch = data.pitch || 0;
    this.health = data.health || 1000;
    this.dead = false;
    this.vel.set(0, 0, 0);
    this.grounded = this.supported();
    this.weapons.restore(data.ammo);
    if (typeof data.grenades === "number") this.weapons.setGrenades(data.grenades);
    if (typeof data.weapon === "number") this.weapons.switchTo(data.weapon);
    this.hud.setHealth(this.health);
    this.updateCamera(0);
  }

  respawn() {
    this.health = 1000;
    this.dead = false;
    this.vel.set(0, 0, 0);
    this.pitch = 0;
    this.weapons.refillMags();
    this.hud.setHealth(this.health);
  }
}
