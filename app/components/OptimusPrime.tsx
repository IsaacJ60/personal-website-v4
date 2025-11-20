"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Group } from "three";

import { Skeleton } from "@/components/ui/skeleton";

type OptimusModelProps = {
  onLoaded?: () => void;
};

function OptimusModel({ onLoaded }: OptimusModelProps) {
  const ref = useRef<Group>(null);
  const { scene } = useGLTF("/models/truck_rotb.glb"); // or optimus.glb etc.

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.4;
    }
  });

  // Call onLoaded once when the model is ready
  useEffect(() => {
    if (onLoaded) onLoaded();
  }, [onLoaded]);

  return <primitive ref={ref} object={scene} />;
}

useGLTF.preload("/models/truck_rotb.glb");

export function OptimusPrimeSpinner() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="w-full flex justify-center">
      {/* fixed-size wrapping box so overlay can position correctly */}
      <div className="relative" style={{ width: 200, height: 200 }}>
        <Canvas
          camera={{ position: [0, 1.5, 15], fov: 35 }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          <Suspense fallback={null}>
            <Stage intensity={0.6} environment="city" adjustCamera={false}>
              <OptimusModel onLoaded={() => setLoaded(true)} />
            </Stage>
            <OrbitControls enableZoom={false} enablePan={false} />
          </Suspense>
        </Canvas>

        {/* Skeleton overlay on top of the canvas */}
        <div
          className={
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 " +
            (loaded ? "opacity-0" : "opacity-100")
          }
        >
          <Skeleton className="h-[200px] w-[200px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
