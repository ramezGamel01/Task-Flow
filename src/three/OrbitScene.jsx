// Today as a small solar system. Each open task is a planet coloured by its category;
// high priority circles closest, low priority furthest out. Finishing a task pulls its
// planet down into a tight ring around the core, and the core's ring fills with the day's
// progress. Scrolling the page tips the whole system on its side and draws the camera back.
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CATEGORY_COLORS } from "../data/palette.js";

const RINGS = { high: 2.3, medium: 3.4, low: 4.5 };
const SPEED = { high: 0.2, medium: 0.13, low: 0.085 };
const SIZE = { high: 0.27, medium: 0.22, low: 0.18 };
const DONE_RING = 1.35;

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A seeded scatter of stars, so the sky looks the same on every visit
function starPositions(count) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 16 + rand() * 22;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    out[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    out[i * 3 + 1] = r * Math.cos(phi) * 0.6;
    out[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 8;
  }
  return out;
}

function Stars({ dark, motion }) {
  const ref = useRef();
  const positions = useMemo(() => starPositions(700), []);
  useFrame((_, dt) => {
    if (motion && ref.current) ref.current.rotation.y += dt * 0.006;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={dark ? 0.09 : 0.08} color={dark ? "#ffffff" : "#7a68f0"} transparent opacity={dark ? 0.75 : 0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Ring({ radius, dark, strong }) {
  const geometry = useMemo(() => new THREE.TorusGeometry(radius, strong ? 0.012 : 0.008, 6, 160), [radius, strong]);
  return (
    <mesh geometry={geometry} rotation-x={Math.PI / 2}>
      <meshBasicMaterial color={dark ? "#b6a9ff" : "#6d5ef5"} transparent opacity={dark ? 0.26 : 0.22} depthWrite={false} />
    </mesh>
  );
}

function Core({ progress, glow, dark, motion }) {
  const core = useRef();
  const halo = useRef();
  const arc = useRef();
  const shown = useRef(progress);
  const arcGeometry = useRef(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => () => arcGeometry.current?.dispose(), []);
  // With animations off the scene only draws on demand, so ask for a frame when progress changes
  useEffect(() => invalidate(), [progress, invalidate]);

  useFrame(({ clock }, dt) => {
    // Ease the progress ring towards the real value so finishing a task animates it
    const k = motion ? 1 - Math.pow(0.02, dt) : 1;
    const before = shown.current;
    shown.current += (progress - shown.current) * k;
    if (arc.current && (Math.abs(before - shown.current) > 0.0005 || !arcGeometry.current)) {
      arcGeometry.current?.dispose();
      arcGeometry.current = new THREE.TorusGeometry(0.98, 0.05, 8, 96, Math.max(0.001, shown.current * Math.PI * 2));
      arc.current.geometry = arcGeometry.current;
    }
    const t = clock.elapsedTime;
    const pulse = motion ? 1 + Math.sin(t * 1.6) * 0.025 : 1;
    const full = shown.current > 0.999 ? 1.12 : 1;
    if (core.current) core.current.scale.setScalar((0.52 + shown.current * 0.12) * pulse * full);
    if (halo.current) {
      const s = (3.2 + shown.current * 1.4) * pulse * full;
      halo.current.scale.set(s, s, 1);
      halo.current.material.opacity = (dark ? 0.55 : 0.42) + shown.current * 0.25;
    }
  });

  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color={dark ? "#8f7dff" : "#7a66ff"} emissive={dark ? "#6a4ff0" : "#7c5cff"} emissiveIntensity={dark ? 1.4 : 0.9} roughness={0.35} metalness={0.1} />
      </mesh>
      <sprite ref={halo}>
        <spriteMaterial map={glow} color={dark ? "#8b74ff" : "#9d8cff"} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* The day's progress, drawn as an arc lying flat around the core */}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.98, 0.022, 6, 96]} />
        <meshBasicMaterial color={dark ? "#ffffff" : "#6d5ef5"} transparent opacity={0.12} />
      </mesh>
      <mesh ref={arc} rotation-x={Math.PI / 2} rotation-z={Math.PI / 2}>
        <meshBasicMaterial color={dark ? "#ffd27a" : "#ff8fb3"} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Planet({ planet, index, count, glow, motion, dir, hovered, onHover, onSelect, registry }) {
  const group = useRef();
  const body = useRef();
  const halo = useRef();
  const target = planet.done ? DONE_RING : RINGS[planet.priority];
  const radius = useRef(target);
  const angle = useRef((index / Math.max(1, count)) * Math.PI * 2 + (planet.done ? 0.4 : { high: 0, medium: 0.7, low: 1.4 }[planet.priority]));
  const color = useMemo(() => new THREE.Color(CATEGORY_COLORS[planet.category]), [planet.category]);
  const isHovered = hovered === planet.id;
  const invalidate = useThree((state) => state.invalidate);
  const scale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  useEffect(() => invalidate(), [planet.done, isHovered, invalidate]);

  useEffect(() => {
    const map = registry.current;
    map.set(planet.id, group);
    return () => map.delete(planet.id);
  }, [planet.id, registry]);

  useFrame(({ clock }, dt) => {
    const speed = planet.done ? 0.32 : SPEED[planet.priority];
    if (motion && !isHovered) angle.current += dt * speed * dir;
    radius.current += (target - radius.current) * (motion ? 1 - Math.pow(0.03, dt) : 1);
    const a = angle.current;
    if (group.current) {
      group.current.position.set(Math.cos(a) * radius.current, Math.sin(a * 2 + index) * (planet.done ? 0.04 : 0.12), Math.sin(a) * radius.current);
    }
    const base = planet.done ? 0.5 : 1;
    const s = base * (isHovered ? 1.45 : 1);
    if (body.current) body.current.scale.lerp(scale.set(s, s, s), motion ? 0.18 : 1);
    if (halo.current) {
      const pulse = planet.overdue && motion ? 1 + Math.sin(clock.elapsedTime * 4) * 0.18 : 1;
      const h = SIZE[planet.priority] * (planet.overdue ? 7 : 5) * s * pulse;
      halo.current.scale.set(h, h, 1);
    }
  });

  return (
    <group ref={group}>
      <mesh
        ref={body}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(planet.id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(planet.id);
        }}
      >
        <sphereGeometry args={[SIZE[planet.priority], 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={planet.done ? 0.15 : 0.55} roughness={0.45} transparent opacity={planet.done ? 0.7 : 1} />
      </mesh>
      <sprite ref={halo}>
        <spriteMaterial map={glow} color={planet.overdue ? "#ff5d6c" : color} transparent opacity={planet.done ? 0.25 : 0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

// Moves the HTML label that names the planet under the pointer
function LabelTracker({ hovered, registry, label }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const el = label.current;
    if (!el) return;
    const obj = hovered ? registry.current.get(hovered)?.current : null;
    if (!obj) {
      el.style.opacity = "0";
      return;
    }
    obj.getWorldPosition(v);
    v.y += 0.55;
    v.project(camera);
    el.style.opacity = "1";
    el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
  });
  return null;
}

function Rig({ scroll, motion, children }) {
  const group = useRef();
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  useFrame(({ camera, pointer }, dt) => {
    const p = scroll.current;
    const k = motion ? 1 - Math.pow(0.01, dt) : 1;
    if (group.current) {
      // Tip from a three-quarter view to edge-on as the page scrolls
      const tilt = 0.5 + p * 0.95;
      group.current.rotation.x += (tilt - group.current.rotation.x) * k;
      const sway = motion ? pointer.x * 0.18 : 0;
      group.current.rotation.z += (sway * 0.4 - group.current.rotation.z) * k;
      group.current.rotation.y += (sway - group.current.rotation.y) * k;
    }
    const z = 11.6 + p * 5;
    const y = 0.6 + (motion ? pointer.y * 0.5 : 0);
    camera.position.x += (0 - camera.position.x) * k;
    camera.position.y += (y - camera.position.y) * k;
    camera.position.z += (z - camera.position.z) * k;
    camera.lookAt(look);
  });
  return (
    <group position-y={-0.25}>
      <group ref={group}>{children}</group>
    </group>
  );
}

export default function OrbitScene({ planets, progress, dark, motion, dir = 1, active = true, scroll, hovered, onHover, onSelect, label }) {
  const glow = useMemo(() => glowTexture(), []);
  const registry = useRef(new Map());
  useEffect(() => () => glow.dispose(), [glow]);
  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  // Planets on each ring are spaced evenly
  const placed = useMemo(() => {
    const groups = {};
    for (const p of planets) {
      const key = p.done ? "done" : p.priority;
      (groups[key] ??= []).push(p);
    }
    return Object.values(groups).flatMap((list) => list.map((p, i) => ({ planet: p, index: i, count: list.length })));
  }, [planets]);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.6, 10.5], fov: 40 }}
      frameloop={active ? (motion ? "always" : "demand") : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onPointerMissed={() => onHover(null)}
    >
      <ambientLight intensity={dark ? 0.35 : 0.9} />
      <pointLight position={[0, 0, 0]} intensity={dark ? 40 : 26} distance={18} color={dark ? "#a08cff" : "#8c78ff"} />
      <directionalLight position={[4, 6, 5]} intensity={dark ? 0.6 : 1.1} />
      <Stars dark={dark} motion={motion} />
      <Rig scroll={scroll} motion={motion}>
        <Core progress={progress} glow={glow} dark={dark} motion={motion} />
        <Ring radius={DONE_RING} dark={dark} />
        <Ring radius={RINGS.high} dark={dark} strong />
        <Ring radius={RINGS.medium} dark={dark} />
        <Ring radius={RINGS.low} dark={dark} />
        {placed.map(({ planet, index, count }) => (
          <Planet key={planet.id} planet={planet} index={index} count={count} glow={glow} motion={motion} dir={dir} hovered={hovered} onHover={onHover} onSelect={onSelect} registry={registry} />
        ))}
      </Rig>
      <LabelTracker hovered={hovered} registry={registry} label={label} />
    </Canvas>
  );
}
