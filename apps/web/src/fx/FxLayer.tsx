import { useEffect, useRef } from "react";
import { attachFxCanvas } from "./engine.js";

/** The single overlay that every effect draws into. It never takes a pointer event. */
export function FxLayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  useEffect(() => {
    attachFxCanvas(canvas.current, text.current);
    return () => attachFxCanvas(null, null);
  }, []);
  return (
    <div className="fx-layer" aria-hidden="true">
      <canvas ref={canvas} className="fx-canvas" />
      <div ref={text} className="fx-text" />
    </div>
  );
}
