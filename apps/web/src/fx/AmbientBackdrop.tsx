import { useEffect, useRef } from "react";
import { useExperience } from "../study/experience.js";

/**
 * A slow aurora behind the interface, drawn by one fragment shader at reduced resolution. It
 * takes its hue from `--ambient-accent` on the root element, so a course tints its own lessons.
 * Reduced motion draws one still frame; without WebGL the CSS gradient underneath remains.
 */
const vertex = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const fragment = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec3 a;uniform float k;uniform float l;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,w=.5;for(int i=0;i<5;i++){v+=w*n(p);p=p*2.03+vec2(1.7,9.2);w*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/r;vec2 q=uv*vec2(r.x/r.y,1.)*1.6;
float s=t*.035;
float f1=fbm(q+vec2(s,-s*.6)+fbm(q*1.3-vec2(s*.7,s)));
float f2=fbm(q*1.7-vec2(s*1.2,s*.4)+f1);
float band=smoothstep(.25,.95,f2)*smoothstep(-.15,.95,uv.y);
float curtain=pow(smoothstep(.35,1.,uv.y),1.5)*(.55+.45*sin(q.x*2.2+f1*5.+s*8.));
vec3 deep=vec3(.035,.04,.05);
vec3 c1=a;vec3 c2=vec3(.42,.28,.95);vec3 c3=vec3(.1,.7,.95);
vec3 col=deep+band*mix(c1,c2,smoothstep(.3,.8,f1))*.85*k+curtain*mix(c1,c3,f2)*.22*k+pow(f2,3.)*c3*.2*k;
float stars=step(.9975,h(floor(gl_FragCoord.xy/2.)))*(.5+.5*sin(t*2.+h(floor(gl_FragCoord.xy))*40.));
col+=stars*.4*(1.-band);
float v=1.-.5*length(uv-vec2(.5,.7));
vec3 day=vec3(.955,.965,.985)-band*(1.-mix(c1,c2,smoothstep(.3,.8,f1)))*.16*k-curtain*(1.-mix(c1,c3,f2))*.07*k;
gl_FragColor=vec4(mix(col*v,day*(.97+.03*v),l),1.);}`;

function parseColour(value: string): [number, number, number] {
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return [0.24, 0.85, 0.5];
  const n = Number.parseInt(match[1]!, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function AmbientBackdrop({ intensity = 1 }: { intensity?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { reduced, theme, backdrop } = useExperience();
  const calm = backdrop === "calm";
  useEffect(() => {
    const element = canvas.current;
    if (calm || !element || typeof WebGLRenderingContext === "undefined") return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = element.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    } catch {
      gl = null;
    }
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uResolution = gl.getUniformLocation(program, "r");
    const uTime = gl.getUniformLocation(program, "t");
    const uAccent = gl.getUniformLocation(program, "a");
    const uIntensity = gl.getUniformLocation(program, "k");
    const uLight = gl.getUniformLocation(program, "l");
    const scale = 0.5;
    const resize = () => {
      element.width = Math.max(1, Math.round(window.innerWidth * scale));
      element.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl!.viewport(0, 0, element.width, element.height);
    };
    resize();
    window.addEventListener("resize", resize);
    let accent = parseColour(getComputedStyle(document.documentElement).getPropertyValue("--ambient-accent"));
    let shown = [...accent] as [number, number, number];
    const started = performance.now() - Math.random() * 60_000;
    let frame = 0;
    let previous = 0;
    const draw = (now: number) => {
      accent = parseColour(getComputedStyle(document.documentElement).getPropertyValue("--ambient-accent"));
      shown = shown.map((v, i) => v + (accent[i]! - v) * 0.04) as [number, number, number];
      gl!.uniform2f(uResolution, element.width, element.height);
      gl!.uniform1f(uTime, (now - started) / 1000);
      gl!.uniform3f(uAccent, shown[0], shown[1], shown[2]);
      gl!.uniform1f(uIntensity, intensity);
      gl!.uniform1f(uLight, theme === "light" ? 1 : 0);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (document.hidden || now - previous < 33) return;
      previous = now;
      draw(now);
    };
    if (reduced) {
      shown = accent;
      draw(started + 20_000);
    } else frame = requestAnimationFrame(loop);
    element.dataset["ready"] = "true";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      delete element.dataset["ready"];
    };
  }, [reduced, intensity, theme, calm]);
  // Calm: a still gradient in the course's colour, nothing moving behind the work.
  if (calm) return <div className="ambient-backdrop ambient-backdrop--calm" data-ready aria-hidden="true" />;
  // A fresh canvas per setting: a WebGL context cannot be reinitialised on the same element.
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas is not focusable; this one is decoration.
    <canvas
      key={`${reduced}:${intensity}:${theme}`}
      ref={canvas}
      className="ambient-backdrop"
      aria-hidden="true"
    />
  );
}
