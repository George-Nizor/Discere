// Discere's interface icons in the Instrumenta v2 style (brand/ALIGNMENT.md): a flat drawing on a
// 48-unit grid, an ink outline and a stepped extrusion down and to the right. The renderer is the
// brand library's own algorithm (Instrumenta brand/icons/instrumenta-icons.js @ 80d1864); only the
// glyphs and their meaning-colours are Discere's. Output is presentation attributes only, so it is
// safe under a strict Content-Security-Policy. Generated mock: docs/brand/README.md.
/* eslint-disable */

  function oklchToHex(L: number, C: number, h: number): string {
    const a = C * Math.cos((h * Math.PI) / 180);
    const b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    return (
      "#" +
      lin
        .map((x: number) => {
          const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(x, 0) ** (1 / 2.4) - 0.055;
          return Math.round(Math.min(1, Math.max(0, v)) * 255)
            .toString(16)
            .padStart(2, "0");
        })
        .join("")
        .toUpperCase()
    );
  }
  // Same formula as the suite: L 0.70, C 0.155 for the accent; tint, deep and ink derived.
  function colours(hue: number, chroma = 0.155) {
    return {
      accent: oklchToHex(0.7, chroma, hue),
      light: oklchToHex(0.86, Math.min(chroma, 0.09), hue),
      deep: oklchToHex(0.42, Math.min(chroma, 0.11), hue),
      ink: oklchToHex(0.2, 0.035, hue),
    };
  }
  // Hues by meaning. Blue is Discere; gold is reward; ember is heat; green is only "correct".
  const HUE: Record<string, number> = { blue: 258, gold: 85, ember: 45, green: 150, violet: 300, teal: 195, rose: 5, ice: 230 };

  const G: Record<string, { hue: string; d: string }> = {
    // Navigation
    home: { hue: "blue", d: '<path class="f" d="M8 22 24 8 40 22V40H8Z"/><path class="s" d="M8 22 24 8 40 22V40H8Z"/><rect class="f2" x="19" y="27" width="10" height="13" rx="1.5"/><path class="s" d="M19 40V27H29V40"/><path class="s thin dt" d="M31 15V10H35V18.5"/>' },
    courses: { hue: "blue", d: '<rect class="f2" x="9" y="28" width="30" height="10" rx="2"/><rect class="s" x="9" y="28" width="30" height="10" rx="2"/><rect class="f" x="12" y="18" width="26" height="10" rx="2"/><rect class="s" x="12" y="18" width="26" height="10" rx="2"/><rect class="f2" x="10" y="8" width="27" height="10" rx="2"/><rect class="s" x="10" y="8" width="27" height="10" rx="2"/><path class="s thin dt" d="M15 13H26M17 23H30M14 33H27"/>' },
    you: { hue: "blue", d: '<circle class="f2" cx="24" cy="15" r="7.5"/><circle class="s" cx="24" cy="15" r="7.5"/><path class="f" d="M10 40C10 31 16 25 24 25S38 31 38 40Z"/><path class="s" d="M10 40C10 31 16 25 24 25S38 31 38 40Z"/>' },
    review: { hue: "violet", d: '<rect class="f2" x="9" y="10" width="22" height="28" rx="3" transform="rotate(-10 20 24)"/><rect class="s" x="9" y="10" width="22" height="28" rx="3" transform="rotate(-10 20 24)"/><rect class="f" x="18" y="11" width="22" height="28" rx="3"/><rect class="s" x="18" y="11" width="22" height="28" rx="3"/><path class="s thin" d="M23 19H35M23 25H35M23 31H30"/>' },
    settings: { hue: "blue", d: '<path class="f" d="M21 5H27L28 10.5 32.5 12.5 37 9.3 41.2 13.5 38 18 40 22.5 45.5 23.5V29.5L40 30.5 38 35 41.2 39.5 37 43.7 32.5 40.5 28 42.5 27 48H21L20 42.5 15.5 40.5 11 43.7 6.8 39.5 10 35 8 30.5 2.5 29.5V23.5L8 22.5 10 18 6.8 13.5 11 9.3 15.5 12.5 20 10.5Z" transform="translate(24 26.5) scale(.82) translate(-24 -26.5)"/><path class="s" d="M21 5H27L28 10.5 32.5 12.5 37 9.3 41.2 13.5 38 18 40 22.5 45.5 23.5V29.5L40 30.5 38 35 41.2 39.5 37 43.7 32.5 40.5 28 42.5 27 48H21L20 42.5 15.5 40.5 11 43.7 6.8 39.5 10 35 8 30.5 2.5 29.5V23.5L8 22.5 10 18 6.8 13.5 11 9.3 15.5 12.5 20 10.5Z" transform="translate(24 26.5) scale(.82) translate(-24 -26.5)"/><circle class="f2" cx="24" cy="26.5" r="6"/><circle class="s" cx="24" cy="26.5" r="6"/>' },
    // Progress and rewards
    streak: { hue: "ember", d: '<path class="f" d="M24 4C28 12 37 16 37 28A13 13 0 0 1 11 28C11 21 15 18 17 12C19 16 21 17 22 18C22 12 22 8 24 4Z"/><path class="s" d="M24 4C28 12 37 16 37 28A13 13 0 0 1 11 28C11 21 15 18 17 12C19 16 21 17 22 18C22 12 22 8 24 4Z"/><path class="f2 m-flicker" d="M24 24C27 28 30 30 30 34A6 6 0 0 1 18 34C18 30 21 28 24 24Z"/><path class="s thin m-flicker" d="M24 24C27 28 30 30 30 34A6 6 0 0 1 18 34C18 30 21 28 24 24Z"/>' },
    xp: { hue: "blue", d: '<path class="f m-twinkle" d="M24 4C26.5 16 32 21.5 44 24C32 26.5 26.5 32 24 44C21.5 32 16 26.5 4 24C16 21.5 21.5 16 24 4Z"/><path class="s m-twinkle" d="M24 4C26.5 16 32 21.5 44 24C32 26.5 26.5 32 24 44C21.5 32 16 26.5 4 24C16 21.5 21.5 16 24 4Z"/><path class="f2 flat dt" d="M38 6C38.6 9 39.8 10.4 42.5 11C39.8 11.6 38.6 13 38 16C37.4 13 36.2 11.6 33.5 11C36.2 10.4 37.4 9 38 6Z"/>' },
    level: { hue: "blue", d: '<path class="f" d="M24 4 41 10V23C41 33 33 40 24 44 15 40 7 33 7 23V10Z"/><path class="s" d="M24 4 41 10V23C41 33 33 40 24 44 15 40 7 33 7 23V10Z"/><path class="f2" d="M24 14 27 21 34.5 21.5 28.8 26.2 30.6 33.5 24 29.6 17.4 33.5 19.2 26.2 13.5 21.5 21 21Z"/><path class="s thin" d="M24 14 27 21 34.5 21.5 28.8 26.2 30.6 33.5 24 29.6 17.4 33.5 19.2 26.2 13.5 21.5 21 21Z"/>' },
    league: { hue: "teal", d: '<path class="f" d="M14 8H34L43 18 24 42 5 18Z"/><path class="f2" d="M14 8H34L29 18H19Z"/><path class="s" d="M14 8H34L43 18 24 42 5 18Z"/><path class="s thin" d="M5 18H43M19 18 24 42 29 18M14 8 19 18M34 8 29 18"/>' },
    chest: { hue: "gold", d: '<path class="f2 m-lid" d="M7 21V16C7 10 15 7 24 7S41 10 41 16V21Z"/><path class="s m-lid" d="M7 21V16C7 10 15 7 24 7S41 10 41 16V21Z"/><rect class="f" x="7" y="21" width="34" height="19" rx="2"/><rect class="s" x="7" y="21" width="34" height="19" rx="2"/><path class="s thin" d="M15 21V40M33 21V40"/><rect class="solid" x="21" y="19" width="6" height="9" rx="1.5"/>' },
    // Quests
    target: { hue: "rose", d: '<circle class="f" cx="22" cy="26" r="17"/><circle class="s" cx="22" cy="26" r="17"/><circle class="f2" cx="22" cy="26" r="10.5"/><circle class="s" cx="22" cy="26" r="10.5"/><circle class="solid" cx="22" cy="26" r="4"/><path class="s flat" d="M22 26 40 8M34 7.5 40.5 7.5 40.5 14"/>' },
    brain: { hue: "violet", d: '<path class="f" d="M24 10C20 6 11 8 10 15 5 18 6 26 9 28 8 35 15 40 21 38L24 39 27 38C33 40 40 35 39 28 42 26 43 18 38 15 37 8 28 6 24 10Z"/><path class="s" d="M24 10C20 6 11 8 10 15 5 18 6 26 9 28 8 35 15 40 21 38L24 39 27 38C33 40 40 35 39 28 42 26 43 18 38 15 37 8 28 6 24 10Z"/><path class="s thin" d="M24 10V39M24 19C20 19 18 16 17 14M24 28C19 28 15 30 14 26M24 22C28 22 31 19 32 16M24 31C29 31 33 30 35 27"/>' },
    combo: { hue: "ember", d: '<path class="f" d="M18 8C21 14 27 17 27 25A9 9 0 0 1 9 25C9 20 12 18 13 14 14 17 16 18 17 18 17 14 17 11 18 8Z"/><path class="s" d="M18 8C21 14 27 17 27 25A9 9 0 0 1 9 25C9 20 12 18 13 14 14 17 16 18 17 18 17 14 17 11 18 8Z"/><path class="f2" d="M33 16C36 21 41 24 41 30A7.5 7.5 0 0 1 26 30C26 26 28 24 29 21 30 23 31 24 32 24 32 21 32 19 33 16Z"/><path class="s" d="M33 16C36 21 41 24 41 30A7.5 7.5 0 0 1 26 30C26 26 28 24 29 21 30 23 31 24 32 24 32 21 32 19 33 16Z"/><path class="s thin" d="M13 40H35"/>' },
    bolt: { hue: "gold", d: '<path class="f" d="M28 4 9 27H22L19 44 39 19H26Z"/><path class="s" d="M28 4 9 27H22L19 44 39 19H26Z"/><path class="f2 flat dt" d="M25.5 11 16 23"/>' },
    cards: { hue: "violet", d: '<rect class="f2" x="9" y="10" width="22" height="28" rx="3" transform="rotate(-10 20 24)"/><rect class="s" x="9" y="10" width="22" height="28" rx="3" transform="rotate(-10 20 24)"/><rect class="f" x="18" y="11" width="22" height="28" rx="3"/><rect class="s" x="18" y="11" width="22" height="28" rx="3"/><path class="s" d="M29 18V32M24 25H34"/>' },
    trophy: { hue: "gold", d: '<path class="s" d="M14 11H8A6.5 6.5 0 0 0 14 22M34 11H40A6.5 6.5 0 0 1 34 22"/><path class="f" d="M13 6H35V17A11 11 0 0 1 13 17Z"/><path class="s" d="M13 6H35V17A11 11 0 0 1 13 17Z"/><rect class="f2" x="21" y="28" width="6" height="7"/><rect class="s" x="21" y="28" width="6" height="7"/><rect class="f" x="14" y="35" width="20" height="7" rx="1.5"/><rect class="s" x="14" y="35" width="20" height="7" rx="1.5"/><path class="f2 flat dt" d="M18 10V16"/>' },
    done: { hue: "green", d: '<circle class="f" cx="24" cy="24" r="18"/><circle class="s" cx="24" cy="24" r="18"/><path class="s m-tick" d="M15.5 24.5 21.5 30.5 33 18"/>' },
    swap: { hue: "teal", d: '<path class="f" d="M8 18A16 16 0 0 1 36 12L38 8 42 20 30 20 33 16A11 11 0 0 0 13 19Z"/><path class="s" d="M8 18A16 16 0 0 1 36 12L38 8 42 20 30 20 33 16A11 11 0 0 0 13 19Z"/><path class="f2" d="M40 30A16 16 0 0 1 12 36L10 40 6 28 18 28 15 32A11 11 0 0 0 35 29Z"/><path class="s" d="M40 30A16 16 0 0 1 12 36L10 40 6 28 18 28 15 32A11 11 0 0 0 35 29Z"/>' },
    freeze: { hue: "ice", d: '<path class="f2" d="M24 6 39 14.5 24 23 9 14.5Z"/><path class="s" d="M24 6 39 14.5 24 23 9 14.5Z"/><path class="f" d="M9 18V31L24 40V26.5Z"/><path class="f2" d="M39 18V31L24 40V26.5Z"/><path class="s" d="M9 18V31L24 40 39 31V18M24 26.5V40M9 18 24 26.5 39 18"/><path class="s thin dt" d="M16 26V32M31 26 34 30"/>' },
    boost: { hue: "violet", d: '<path class="f2" d="M19 5H29V15L38 34A6 6 0 0 1 33 42H15A6 6 0 0 1 10 34L19 15Z"/><path class="f" d="M14 28H34L37.5 35A5 5 0 0 1 33 42H15A5 5 0 0 1 10.5 35Z"/><path class="s" d="M19 5H29V15L38 34A6 6 0 0 1 33 42H15A6 6 0 0 1 10 34L19 15Z"/><path class="s" d="M16 5H32"/><circle class="f2 flat dt" cx="21" cy="34" r="2"/><circle class="f2 flat dt" cx="28" cy="37" r="1.5"/>' },
    // Lesson tools
    readAloud: { hue: "blue", d: '<path class="f" d="M7 19H14L24 11V37L14 29H7Z"/><path class="s" d="M7 19H14L24 11V37L14 29H7Z"/><path class="s m-wave" d="M30 18A8 8 0 0 1 30 30"/><path class="s m-wave w2" d="M34.5 13A14 14 0 0 1 34.5 35"/><path class="s m-wave w4" d="M39 8.5A20 20 0 0 1 39 39.5"/>' },
    sound: { hue: "teal", d: '<path class="f" d="M5 19H12L21 11V37L12 29H5Z"/><path class="s" d="M5 19H12L21 11V37L12 29H5Z"/><path class="s" d="M32 33V12L43 9V30"/><ellipse class="f2" cx="29" cy="33.5" rx="4" ry="3.2"/><ellipse class="s" cx="29" cy="33.5" rx="4" ry="3.2"/><ellipse class="f2" cx="40" cy="30.5" rx="4" ry="3.2"/><ellipse class="s" cx="40" cy="30.5" rx="4" ry="3.2"/>' },
    working: { hue: "blue", d: '<rect class="f2" x="8" y="6" width="26" height="36" rx="2.5"/><rect class="s" x="8" y="6" width="26" height="36" rx="2.5"/><path class="s thin" d="M13 14H29M13 20H29M13 26H22"/><path class="f m-write" d="M38.5 18 43 22.5 26 39.5 20 41 21.5 35Z"/><path class="s m-write" d="M38.5 18 43 22.5 26 39.5 20 41 21.5 35ZM35 21.5 39.5 26"/>' },
    calculator: { hue: "blue", d: '<rect class="f" x="10" y="5" width="28" height="38" rx="4"/><rect class="s" x="10" y="5" width="28" height="38" rx="4"/><rect class="f2" x="15" y="10" width="18" height="8" rx="1.5"/><rect class="s thin" x="15" y="10" width="18" height="8" rx="1.5"/><rect class="solid" x="15" y="23" width="4.5" height="4" rx="1"/><rect class="solid" x="21.75" y="23" width="4.5" height="4" rx="1"/><rect class="solid" x="28.5" y="23" width="4.5" height="4" rx="1"/><rect class="solid" x="15" y="30" width="4.5" height="4" rx="1"/><rect class="solid" x="21.75" y="30" width="4.5" height="4" rx="1"/><rect class="f2" x="28.5" y="30" width="4.5" height="9" rx="1"/><rect class="solid" x="15" y="37" width="11.25" height="2" rx="1"/>' },
    tutor: { hue: "blue", d: '<path class="f" d="M6 10A4 4 0 0 1 10 6H38A4 4 0 0 1 42 10V30A4 4 0 0 1 38 34H20L11 42V34H10A4 4 0 0 1 6 30Z"/><path class="s" d="M6 10A4 4 0 0 1 10 6H38A4 4 0 0 1 42 10V30A4 4 0 0 1 38 34H20L11 42V34H10A4 4 0 0 1 6 30Z"/><path class="s" d="M19.5 16A4.5 4.5 0 1 1 24 20.5V23"/><circle class="solid" cx="24" cy="28" r="1.6"/>' },
    hint: { hue: "gold", d: '<path class="f" d="M24 5A13 13 0 0 1 32 28V33H16V28A13 13 0 0 1 24 5Z"/><path class="s" d="M24 5A13 13 0 0 1 32 28V33H16V28A13 13 0 0 1 24 5Z"/><rect class="f2" x="17" y="33" width="14" height="8" rx="2"/><rect class="s" x="17" y="33" width="14" height="8" rx="2"/><path class="s thin" d="M20 28 24 20 28 28"/>' },
    // Achievements
    scholar: { hue: "blue", d: '<path class="f" d="M24 14C19 10 12 10 6 12V36C12 34 19 34 24 38Z"/><path class="f2" d="M24 14C29 10 36 10 42 12V36C36 34 29 34 24 38Z"/><path class="s" d="M24 14C19 10 12 10 6 12V36C12 34 19 34 24 38ZM24 14C29 10 36 10 42 12V36C36 34 29 34 24 38Z"/>' },
    polymath: { hue: "teal", d: '<circle class="f" cx="24" cy="24" r="18"/><path class="f2" d="M14 12C19 14 20 19 17 22S12 28 15 33L11 33C7 28 7 18 14 12ZM31 9C29 13 31 16 35 17S40 23 38 27L41 27C43 20 39 12 31 9ZM25 31C29 30 32 34 30 39 27 40 24 39 23 36S22 32 25 31Z"/><circle class="s" cx="24" cy="24" r="18"/>' },
    bridge: { hue: "teal", d: '<path class="f" d="M5 24H43V40H35C35 33 30 29 24 29S13 33 13 40H5Z"/><path class="s" d="M5 24H43V40H35C35 33 30 29 24 29S13 33 13 40H5Z"/><rect class="f2" x="2" y="17" width="44" height="7" rx="1.5"/><rect class="s" x="2" y="17" width="44" height="7" rx="1.5"/><path class="s thin dt" d="M9 9V17M17 9V17M31 9V17M39 9V17M7 9H41"/>' },
  };

  const TIERS: Record<string, { steps: number; dx: number; dy: number; line: number; thin: number; depthLine: number; details: boolean }> = {
    full: { steps: 6, dx: 0.5, dy: 0.55, line: 2.3, thin: 1.7, depthLine: 3.2, details: true },
    medium: { steps: 3, dx: 0.85, dy: 0.95, line: 2.8, thin: 2.1, depthLine: 3.4, details: false },
    small: { steps: 2, dx: 1.1, dy: 1.25, line: 3.4, thin: 2.6, depthLine: 3.6, details: false },
  };
  const tierFor = (size?: number) => (size && size <= 16 ? "small" : size && size <= 24 ? "medium" : "full");
  const TAG = /<(\/?)(g|rect|path|circle|ellipse)\b([^>]*?)(\/?)>/g;
  function paint(markup: string, look: (tag: string, tokens: string[]) => string | null): string {
    return markup.replace(TAG, (whole: string, closing: string, tag: string, attrs: string, selfClose: string) => {
      if (closing) return whole;
      const m = attrs.match(/\sclass="([^"]*)"/);
      const tokens = m?.[1] ? m[1].split(/\s+/) : [];
      const rest = attrs.replace(/\sclass="[^"]*"/, "");
      const motion = tokens.filter((t) => /^(m-|w\d)/.test(t));
      const extra = look(tag, tokens);
      if (extra === null) return "";
      const cls = motion.length ? ` class="${motion.join(" ")}"` : "";
      return `<${tag}${cls}${rest}${extra}${selfClose ? "/" : ""}>`;
    });
  }
  const dropDetails = (s: string) => s.replace(/<(rect|path|circle|ellipse)\b[^>]*\bclass="[^"]*\bdt\b[^"]*"[^>]*\/>/g, "");

  function render(id: string, options: { size?: number; hue?: string; label?: string; tier?: string } = {}): string {
    const glyph = G[id];
    if (!glyph) throw new Error(`Unknown Discere icon: ${id}`);
    const tier = TIERS[options.tier || tierFor(options.size)]!;
    const col = colours(HUE[options.hue || glyph.hue]!);
    let d = glyph.d;
    if (!tier.details) d = dropDetails(d);
    const round = ' stroke-linecap="round" stroke-linejoin="round"';
    const front = paint(d, (tag: string, t: string[]) => {
      if (tag === "g") return "";
      if (t.includes("f")) return ` fill="${col.accent}"`;
      if (t.includes("f2")) return ` fill="${col.light}"`;
      if (t.includes("solid")) return ` fill="${col.ink}"`;
      if (t.includes("s")) return ` fill="none" stroke="${col.ink}" stroke-width="${t.includes("thin") ? tier.thin : tier.line}"${round}`;
      return "";
    });
    const depthLayer = paint(d, (tag: string, t: string[]) => {
      if (tag === "g") return "";
      if (t.includes("flat")) return null;
      return ` fill="${col.deep}" stroke="${col.deep}" stroke-width="${tier.depthLine}" stroke-linejoin="round"`;
    });
    const depth = [...Array(tier.steps)]
      .map((_: unknown, i: number) => {
        const n = tier.steps - i;
        return `<g transform="translate(${(n * tier.dx).toFixed(2)} ${(n * tier.dy).toFixed(2)})">${depthLayer}</g>`;
      })
      .join("");
    const shift = `translate(${(-tier.steps * tier.dx * 0.5).toFixed(2)} ${(-tier.steps * tier.dy * 0.5).toFixed(2)})`;
    const size = options.size ? ` width="${options.size}" height="${options.size}"` : "";
    const label = options.label ? ` role="img" aria-label="${options.label}"` : ' aria-hidden="true"';
    return `<svg viewBox="-2 -2 52 52"${size} class="di di-${id}"${label}><g transform="${shift}"><g class="di-body"><g>${depth}</g><g>${front}</g></g></g></svg>`;
  }



export type DiscereIconName = keyof typeof G;
export type DiscereIconHue = keyof typeof HUE;
export interface IconOptions {
  size?: number;
  hue?: DiscereIconHue;
  label?: string;
  tier?: "full" | "medium" | "small";
}
export const renderDiscereIcon = render as (id: DiscereIconName, options?: IconOptions) => string;
export const discereIconNames = Object.keys(G) as DiscereIconName[];
export { colours as iconColours, HUE as ICON_HUES };
