"use client"

import * as React from "react"
import { Sparkles, ArrowUpRight, ShieldCheck, HeartPulse, CheckCircle2 } from "lucide-react"

/* ------------------------------------------------------------------ types */

export type MascotPortfolioHeroProps = {
  /**
   * Height of the hero. Must be a definite length — the poster is fitted to
   * this box, so a percentage collapses to 0px unless every ancestor up to
   * `<html>` has a real height. Never pass `"100%"`.
   */
  height?: string
  /** Floor for the height, so the headline stays legible. */
  minHeight?: string

  /* ---- top rule ---- */
  /** Set in the green half of the index pill, top left. */
  index?: string
  /** Set beside the index, inside the same pill. */
  discipline?: string
  /** The bold line beside the pill. */
  tagline?: string
  /** Centre-right, set inside braces: `{ first / second }`. */
  collection?: [string, string]
  /** Top right, two lines beside the green dot. */
  reel?: [string, string]

  /* ---- headline ---- */
  /** First headline line, before the arrow. */
  year?: string
  /** First headline line, after the arrow. */
  initials?: string
  /** The ringed stamp beside the first line. */
  badge?: string
  /** Second headline line. */
  line2?: string
  /** Third headline line. Its last letter gets the looping swash. */
  line3?: string
  /** Fourth line, the big one — set before the vertical tag. */
  word?: string
  /** The vertical label between `word` and the bracketed letters. */
  verticalTag?: string
  /** Set between the two arcs, followed by an asterisk. */
  bracketed?: string

  /* ---- pill and services ---- */
  /** White half of the pill. */
  seekingLabel?: string
  /** Green half of the pill. */
  seeking?: string
  /** Turns the green half into a link. */
  href?: string
  /** The row along the bottom edge. */
  services?: string[]

  /* ---- the character ---- */
  /** Character type: "cow" (default) or "man" */
  character?: "cow" | "man"
  /** Cycled through, one per click on the character. */
  greetings?: string[]
  skin?: string
  beanie?: string
  shirt?: string
  /** The leather tag on the beanie cuff or ear tag. */
  tag?: string

  /* ---- palette ---- */
  /** The green: index pill, dot, seeking pill, hover rules. */
  accent?: string
  /** The sheet. */
  paper?: string
  /** Type, rules and the room. */
  ink?: string
  className?: string

  /** Optional Unsplash stock image showcase */
  stockImage?: string
  stockImageLabel?: string
}

const SANS_STACK =
  '"Inter","Plus Jakarta Sans","Helvetica Neue",Helvetica,Arial,system-ui,sans-serif'
const DISPLAY_STACK =
  '"Archivo Black","Syne","Arial Black","Helvetica Neue",Helvetica,Arial,system-ui,sans-serif'

/* The character's sheet. Every coordinate in the figure lives in this box. */
const CW = 600
const CH = 720

/* --------------------------------------------------------------- the gaze
   The figure is flat SVG. What sells it as a head turning is parallax: the
   features ride on top of the skull and move further than it does, the nose/muzzle
   sits proud of the face and moves further still, and the ears go the other
   way and foreshorten. Nothing here is 3D maths — it is a stack of layers
   whose offsets are ordered by how far each one sits from the neck. */

// #region gaze

/**
 * Where the pointer is, relative to the head, as a direction in (-1, 1) on
 * each axis. Soft-saturated rather than clamped, so the head never slams into
 * a stop: it keeps turning a little further the further away you go.
 */
function aim(px: number, py: number, cx: number, cy: number, rx: number, ry: number) {
  const sat = (v: number) => v / Math.sqrt(1 + v * v)
  return [sat((px - cx) / rx), sat((py - cy) / ry)]
}

/** Frame-rate-independent easing of `cur` towards `target`. */
function approach(cur: number, target: number, dt: number, rate: number) {
  return target + (cur - target) * Math.exp(-rate * dt)
}

/**
 * How far each layer moves for a gaze of (x, y). Offsets are in figure units
 * and nested: `face` is relative to `head`, `nose` and `eyes` to `face`.
 * `near` is 0..1, how close the pointer is to the face — it widens the eyes
 * and lifts the brows.
 */
function pose(x: number, y: number, near: number) {
  return {
    body: { dx: x * 4, dy: 0 },
    head: { dx: x * 10, dy: y * 7, rot: x * 4 },
    ears: { dx: -x * 7, dy: -y * 3, lead: 1 + x * 0.16, trail: 1 - x * 0.16 },
    beanie: { dx: x * 13, dy: y * 4 },
    tag: { dx: x * 7, dy: 0 },
    blush: { dx: x * 20, dy: y * 14 },
    face: { dx: x * 28, dy: y * (y < 0 ? 11 : 20) },
    nose: { dx: x * 10, dy: y * 7 },
    eyes: { dx: x * 4, dy: y * 4, scale: 1 + near * 0.14 },
    brows: { dx: x * 3, dy: y * 2 + Math.min(0, y) * 3 - near * 9 },
  }
}

/** Blink envelope: 1 is open, dips towards 0.08 across a 150ms blink. */
function blink(since: number) {
  const d = 0.15
  if (since < 0 || since > d) return 1
  return 1 - Math.sin((Math.PI * since) / d) * 0.92
}

// #endregion

/* ------------------------------------------------------------- the room */

type Seg = [number, number, number, number]

/**
 * A one-point-perspective room in a 1000x1000 box that is stretched to fill
 * the hero. The back wall is a grid; every grid line on its edge runs out to
 * the frame away from the vanishing point; the depth lines are the back wall
 * scaled up about that point. Stretching distorts it, which is fine — it is a
 * room, and a taller screen just gets a taller one.
 */
function room(): { back: Seg[]; rays: Seg[]; depth: string[] } {
  const x0 = 95
  const x1 = 905
  const y0 = 85
  const y1 = 865
  const vx = (x0 + x1) / 2
  const vy = (y0 + y1) / 2
  const cols = 14
  const rows = 11
  const back: Seg[] = []
  const rays: Seg[] = []
  const out = (x: number, y: number): Seg => {
    // Walk from (x, y) away from the vanishing point until the frame.
    const dx = x - vx
    const dy = y - vy
    const tx = dx > 0 ? (1000 - x) / dx : dx < 0 ? -x / dx : Infinity
    const ty = dy > 0 ? (1000 - y) / dy : dy < 0 ? -y / dy : Infinity
    const t = Math.min(tx, ty)
    return [x, y, x + dx * t, y + dy * t]
  }
  for (let i = 0; i <= cols; i++) {
    const x = x0 + ((x1 - x0) * i) / cols
    back.push([x, y0, x, y1])
    rays.push(out(x, y0), out(x, y1))
  }
  for (let j = 0; j <= rows; j++) {
    const y = y0 + ((y1 - y0) * j) / rows
    back.push([x0, y, x1, y])
    rays.push(out(x0, y), out(x1, y))
  }
  const depth = [1.07, 1.16, 1.28, 1.45, 1.7].map((s) => {
    const l = vx + (x0 - vx) * s
    const r = vx + (x1 - vx) * s
    const t = vy + (y0 - vy) * s
    const b = vy + (y1 - vy) * s
    return "M" + l + " " + t + "H" + r + "V" + b + "H" + l + "Z"
  })
  return { back, rays, depth }
}

const ROOM = room()

/** Five irregular petals, closed, as one outline — so the stroke never crosses itself. */
function flowerPath() {
  const n = 180
  const lens = [1, 0.84, 0.95, 0.78, 0.9]
  let d = ""
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = Math.floor(((a + Math.PI / 5) / (Math.PI * 2)) * 5) % 5
    const lobe = Math.pow(Math.abs(Math.cos((a * 5) / 2)), 0.9)
    const r = 50 * (0.3 + 0.7 * lobe * lens[k])
    const x = 60 + Math.cos(a - Math.PI / 2) * r
    const y = 60 + Math.sin(a - Math.PI / 2) * r
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)
  }
  return d + "Z"
}

const FLOWER = flowerPath()

/* ----------------------------------------------------------------- styles */

const CSS = `
.mph-root{position:relative;width:100%;overflow:hidden;isolation:isolate;background:var(--mph-paper);color:var(--mph-ink);container:mph / size;font-family:var(--mph-sans);-webkit-font-smoothing:antialiased;}
.mph-room{position:absolute;inset:0;width:100%;height:100%;display:block;color:var(--mph-ink);pointer-events:none;}
.mph-room line,.mph-room path{vector-effect:non-scaling-stroke;}
.mph-stage{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(100cqw,177.78cqh);aspect-ratio:16/9;container:mphs / inline-size;}

.mph-top{position:absolute;left:4.6%;right:4.6%;top:4.4%;display:grid;grid-template-columns:auto auto 1fr auto auto;align-items:center;column-gap:2.4cqw;font-size:1.05cqw;font-weight:800;line-height:1.1;text-transform:uppercase;letter-spacing:.02em;}
.mph-index{display:inline-flex;align-items:center;gap:.9em;border:.12cqw solid var(--mph-ink);border-radius:999px;padding:.12em .9em .12em .12em;font-size:.72em;}
.mph-index b{background:var(--mph-accent);color:var(--mph-ink);border-radius:999px;padding:.3em 1.2em;font-weight:800;}
.mph-tagline{font-size:1.18em;font-weight:900;margin-left:1cqw;}
.mph-brace{grid-column:4;font-size:1.3em;font-weight:700;letter-spacing:.04em;margin-right:2.6cqw;}
.mph-reel{grid-column:5;display:flex;align-items:center;gap:.8em;font-size:.8em;text-align:right;}
.mph-reel i{display:block;width:1.9em;height:1.9em;border-radius:50%;background:var(--mph-accent);border:.12cqw solid var(--mph-ink);flex:none;}

.mph-h1{position:absolute;left:8.8%;top:17.5%;margin:0;font-family:var(--mph-display);font-weight:900;font-size:6.5cqw;line-height:.93;letter-spacing:-.045em;text-transform:uppercase;color:var(--mph-ink);}
.mph-line{display:block;width:max-content;white-space:nowrap;position:relative;}
.mph-ch{display:inline-block;transition:transform .35s cubic-bezier(.3,1.6,.5,1),color .2s;}
.mph-ch:hover{transform:translateY(-.08em) rotate(-4deg);color:var(--mph-accent);}
.mph-arrow{display:inline-block;width:.6em;height:.6em;margin:0 .06em 0 .1em;vertical-align:-.02em;}
.mph-arrow path{stroke:currentColor;stroke-width:15;fill:none;stroke-linecap:square;}
.mph-badge{position:absolute;top:-.02em;left:calc(100% + .55em);font-family:var(--mph-sans);font-size:.2em;font-weight:800;letter-spacing:0;line-height:1;text-transform:none;border:.13cqw solid var(--mph-ink);border-radius:50%;padding:.75em 1.15em;transform:rotate(-9deg);transition:background .25s,transform .4s cubic-bezier(.3,1.6,.5,1);cursor:default;}
.mph-badge sup{font-size:.7em;margin-left:.1em;}
.mph-badge:hover{background:var(--mph-accent);transform:rotate(6deg) scale(1.08);}
.mph-swash{position:relative;display:inline-block;}
.mph-swash svg{position:absolute;left:-.95em;top:.3em;width:2.55em;height:.72em;overflow:visible;pointer-events:none;}
.mph-swash path{fill:none;stroke:var(--mph-ink);stroke-width:.2cqw;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:0;animation:mph-draw 1.6s .5s cubic-bezier(.6,0,.2,1) both;}
.mph-h1:hover .mph-swash path{animation:mph-draw 1.1s cubic-bezier(.6,0,.2,1) both;}
.mph-l4{font-size:1.2em;letter-spacing:-.02em;margin-top:.04em;}
.mph-vtag{display:inline-flex;flex-direction:column;align-items:stretch;vertical-align:-.02em;margin:0 .1em 0 .06em;width:.2em;}
.mph-vtag span{display:block;background:var(--mph-ink);color:var(--mph-paper);writing-mode:vertical-rl;font-family:var(--mph-sans);font-size:.105em;font-weight:800;letter-spacing:.12em;padding:.55em 0;text-align:center;}
.mph-vtag i{display:block;height:.34em;background:repeating-linear-gradient(to bottom,var(--mph-ink) 0 .02em,transparent .02em .045em);}
.mph-bracket{position:relative;display:inline-block;padding:0 .08em;}
.mph-bracket svg{position:absolute;left:-.02em;right:-.02em;top:-.1em;bottom:-.12em;width:calc(100% + .04em);height:calc(100% + .22em);overflow:visible;}
.mph-bracket path{fill:none;stroke:var(--mph-ink);stroke-width:.62cqw;stroke-linecap:butt;transition:transform .45s cubic-bezier(.3,1.6,.5,1);}
.mph-bracket:hover .mph-arc-t{transform:translateY(-10px);}
.mph-bracket:hover .mph-arc-b{transform:translateY(10px);}
.mph-star{display:inline-block;font-size:.66em;vertical-align:.5em;margin-left:.02em;transition:transform .6s cubic-bezier(.3,1.6,.5,1);}
.mph-l4:hover .mph-star{transform:rotate(180deg) scale(1.2);}

.mph-pill{position:absolute;left:8.8%;top:72.8%;display:flex;align-items:stretch;font-size:1.72cqw;font-weight:800;line-height:1;}
.mph-pill-a{position:relative;z-index:1;background:#fff;color:#111827;border:.16cqw solid var(--mph-ink);border-radius:999px;padding:.72em 1.25em;}
.mph-pill-b{display:inline-flex;align-items:center;gap:.5em;margin-left:-1.4em;padding:.72em 3.4em .72em 3.1em;background:var(--mph-accent);color:#090d11;font-weight:900;border:.16cqw solid var(--mph-ink);border-radius:0 999px 999px 0;text-decoration:none;transition:background .25s,color .25s,padding .35s cubic-bezier(.3,1.4,.5,1);cursor:pointer;}
.mph-pill-b em{font-style:normal;display:inline-block;width:0;overflow:hidden;opacity:0;transition:width .35s,opacity .25s;}
.mph-pill-b:hover,.mph-pill-b:focus-visible{background:var(--mph-ink);color:var(--mph-paper);padding-right:2.4em;outline:none;}
.mph-pill-b:hover em,.mph-pill-b:focus-visible em{width:1em;opacity:1;}

.mph-flower{position:absolute;left:35.4%;top:64%;width:7.4%;aspect-ratio:1;animation:mph-spin 22s linear infinite;cursor:grab;}
.mph-flower svg{display:block;width:100%;height:100%;overflow:visible;transition:transform .5s cubic-bezier(.3,1.8,.5,1);}
.mph-flower:hover svg{transform:scale(1.18) rotate(40deg);}
.mph-flower path{fill:#fff;stroke:var(--mph-ink);stroke-width:2.6;stroke-linejoin:round;}
.mph-curl{position:absolute;left:43.2%;top:52.5%;width:5.6%;aspect-ratio:1;overflow:visible;pointer-events:none;}
.mph-curl path{fill:none;stroke:var(--mph-ink);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;animation:mph-draw 1.4s 1s cubic-bezier(.6,0,.2,1) both;}

.mph-stock-card{position:absolute;right:34%;top:18%;width:11.5cqw;border:.15cqw solid var(--mph-ink);border-radius:.8cqw;overflow:hidden;background:#fff;box-shadow:.35cqw .35cqw 0 var(--mph-ink);transition:transform .3s cubic-bezier(.3,1.4,.5,1);z-index:3;}
.mph-stock-card:hover{transform:translate(-3px,-3px) scale(1.05);}
.mph-stock-card img{width:100%;height:7cqw;object-fit:cover;display:block;}
.mph-stock-card .meta{padding:.35cqw .5cqw;display:flex;align-items:center;gap:.3cqw;font-size:.6cqw;font-weight:800;text-transform:uppercase;color:#111827;background:#fff;}

.mph-services{position:absolute;left:4.6%;bottom:4.6%;display:flex;gap:4cqw;margin:0;padding:0;list-style:none;font-size:1.3cqw;font-weight:800;}
.mph-services li{position:relative;cursor:default;padding-bottom:.25em;}
.mph-services li::after{content:"";position:absolute;left:0;right:0;bottom:0;height:.18em;background:var(--mph-accent);transform:scaleX(0);transform-origin:left;transition:transform .35s cubic-bezier(.6,0,.2,1);}
.mph-services li:hover::after{transform:scaleX(1);}

.mph-rule{position:absolute;width:0;border-left:.1cqw solid var(--mph-ink);}
.mph-rule::after{content:"";position:absolute;bottom:0;left:-.1cqw;width:1.1cqw;border-top:.1cqw solid var(--mph-ink);transform:rotate(28deg);transform-origin:left;}
.mph-rule-l{left:3.7%;top:23%;height:13%;}
.mph-rule-r{left:94.8%;top:66%;height:13%;}

.mph-char{position:absolute;left:55.5%;bottom:-1.2%;width:40.5%;aspect-ratio:600/720;padding:0;margin:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:40% 40% 8% 8%;}
.mph-char:focus-visible{outline:.2cqw dashed var(--mph-ink);outline-offset:.4cqw;}
.mph-char svg{display:block;width:100%;height:100%;overflow:visible;}
.mph-tagwig{transform-box:fill-box;transform-origin:50% 0;}
.mph-happy .mph-tagwig{animation:mph-wiggle .9s cubic-bezier(.3,1.6,.5,1);}
.mph-bubble{position:absolute;left:-10%;top:4%;max-width:54%;background:#fff;color:#111827;border:.16cqw solid #111827;border-radius:1.4em 1.4em 1.4em .2em;padding:.8em 1.1em;font-size:1.3cqw;font-weight:800;line-height:1.2;text-align:left;box-shadow:.35cqw .35cqw 0 var(--mph-accent);transform-origin:0 100%;transform:scale(0) rotate(-8deg);opacity:0;transition:transform .45s cubic-bezier(.3,1.6,.5,1),opacity .2s;pointer-events:none;z-index:15;}
.mph-bubble[data-on="true"]{transform:scale(1) rotate(-4deg);opacity:1;}

@keyframes mph-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}
@keyframes mph-spin{to{transform:rotate(360deg);}}
@keyframes mph-wiggle{0%{transform:rotate(0);}25%{transform:rotate(-16deg);}55%{transform:rotate(12deg);}80%{transform:rotate(-5deg);}100%{transform:rotate(0);}}

@container mph (orientation: portrait){
.mph-stage{top:0;transform:translateX(-50%);width:min(100cqw,56.25cqh);height:100cqh;aspect-ratio:auto;}
.mph-top{top:5cqw;left:6%;right:6%;grid-template-columns:auto 1fr auto;font-size:2.5cqw;}
.mph-tagline,.mph-brace{display:none;}
.mph-reel{grid-column:3;}
.mph-h1{left:7%;top:17cqw;font-size:11.4cqw;}
.mph-badge{left:calc(100% + .35em);top:.1em;font-size:.22em;}
.mph-pill{left:7%;top:70cqw;font-size:3.5cqw;}
.mph-flower{left:auto;right:6%;top:66cqw;width:13%;}
.mph-curl{left:auto;right:4%;top:44cqw;width:11%;}
.mph-stock-card{display:none;}
.mph-services{left:7%;right:7%;bottom:auto;top:84cqw;flex-wrap:wrap;gap:1.6cqw 5cqw;font-size:3cqw;}
.mph-rule-l{left:3%;top:22cqw;height:12cqw;}
.mph-rule-r{left:95%;top:auto;bottom:40cqw;height:12cqw;}
.mph-char{left:12%;width:76%;bottom:-.6%;}
.mph-bubble{font-size:3cqw;left:-8%;top:2%;max-width:56%;}
}

@media (prefers-reduced-motion: reduce){
.mph-root *,.mph-root *::after{animation:none!important;transition:none!important;}
}
`

/* ------------------------------------------------------------- component */

type Layers = Partial<
  Record<
    | "body" | "head" | "earL" | "earR" | "beanie" | "tag" | "blush"
    | "face" | "nose" | "eyes" | "brows",
    SVGGElement | null
  >
>

const DEFAULT_SERVICES = [
  "Cattle & Bovine",
  "Sheep & Goats",
  "Equine Health",
  "Swine Surveillance",
  "Companion Pets"
]

const DEFAULT_GREETINGS = [
  "Moo! Hi there! 🐄",
  "Ready for an AI health check?",
  "Early detection saves herds! 🩺",
  "Quarantine protocols online ✨",
  "Ticklish! Click 'Start Animal Scan' :) 🐮"
]

export default function MascotPortfolioHero({
  height = "100svh",
  minHeight = "520px",
  index = "08/01",
  discipline = "Veterinary AI",
  tagline = "Early Detection Saves Lives",
  collection = ["Clinical", "Livestock"],
  reel = ["Live AI Triage @ 2026", "250K+ Benchmarks"],
  year = "2026",
  initials = "AI",
  badge = "Instant Scan",
  line2 = "Animal Care",
  line3 = "Health",
  word = "Check",
  verticalTag = "Bovine",
  bracketed = "AI",
  seekingLabel = "Diagnosis*",
  seeking = "Start Animal Scan",
  href = "/detect",
  services = DEFAULT_SERVICES,
  character = "cow",
  greetings = DEFAULT_GREETINGS,
  skin = "#fdfcf7",
  beanie = "#1d1d1f",
  shirt = "#18181a",
  tag = "#facc15",
  accent = "#10b981",
  paper = "#f4f3ef",
  ink = "#111827",
  className,
  stockImage,
  stockImageLabel,
}: MascotPortfolioHeroProps) {
  // Gradient and filter ids are global. Two heroes on one page would otherwise
  // share them and the second mount would repaint the first.
  const uid = React.useId().replace(/:/g, "")
  const id = (n: string) => n + uid
  const u = (n: string) => "url(#" + id(n) + ")"

  const rootRef = React.useRef<HTMLDivElement>(null)
  const charRef = React.useRef<HTMLButtonElement>(null)
  const layers = React.useRef<Layers>({})
  const set = (k: keyof Layers) => (el: SVGGElement | null) => {
    layers.current[k] = el
  }

  const [happy, setHappy] = React.useState(false)
  const [said, setSaid] = React.useState(-1)
  const happyTimer = React.useRef<number | undefined>(undefined)

  // Play pleasant soft chime sound using Web Audio API on click
  const playCuteChime = React.useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = "sine"
      const now = ctx.currentTime
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12) // A5
      
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(now)
      osc.stop(now + 0.3)
    } catch {
      // Audio autoplay policy fallback
    }
  }, [])

  const poke = () => {
    playCuteChime()
    setSaid((n) => (n + 1) % Math.max(1, greetings.length))
    setHappy(true)
    window.clearTimeout(happyTimer.current)
    happyTimer.current = window.setTimeout(() => setHappy(false), 2400)
  }
  React.useEffect(() => () => window.clearTimeout(happyTimer.current), [])

  /* The loop. Everything the pointer drives is written straight to the SVG —
     running it through React state would re-render the whole poster at 60fps. */
  React.useEffect(() => {
    const root = rootRef.current
    const char = charRef.current
    if (!root || !char) return

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    let still = mq.matches
    const onMq = () => (still = mq.matches)
    mq.addEventListener("change", onMq)

    let px = 0
    let py = 0
    let lastMove = -1e9
    let gx = 0
    let gy = 0
    let near = 0
    let prev = performance.now()
    let nextBlink = prev + 1800
    let blinkAt = -1e9
    let raf = 0
    let visible = true

    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      lastMove = performance.now()
    }
    const onLeave = () => (lastMove = -1e9)
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerdown", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    window.addEventListener("blur", onLeave)

    const tr = (dx: number, dy: number) => "translate(" + dx.toFixed(2) + " " + dy.toFixed(2) + ")"
    const L = layers.current

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now

      const r = char.getBoundingClientRect()
      // The head, not the box: the face sits at about 50% across and 48% down.
      const cx = r.left + r.width * 0.5
      const cy = r.top + r.height * 0.48
      let tx = 0
      let ty = 0
      let tn = 0
      const idle = now - lastMove > 3500
      if (!idle) {
        const reach = Math.max(innerWidth, innerHeight)
        ;[tx, ty] = aim(px, py, cx, cy, reach * 0.3, reach * 0.26)
        const dist = Math.hypot(px - cx, py - cy)
        tn = Math.max(0, 1 - dist / (r.width * 0.45))
      } else if (!still) {
        // Nobody is there: look around the room on its own.
        const t = now / 1000
        tx = Math.sin(t * 0.45) * 0.55 + Math.sin(t * 1.1) * 0.1
        ty = Math.sin(t * 0.31 + 1) * 0.25
      }

      const rate = still ? 30 : 7
      gx = approach(gx, tx, dt, rate)
      gy = approach(gy, ty, dt, rate)
      near = approach(near, tn, dt, 8)
      const p = pose(gx, gy, near)
      const breathe = still ? 0 : Math.sin(now / 620) * 1.6

      if (!still && now > nextBlink) {
        blinkAt = now
        // Now and then a double blink, the way animals actually do it.
        nextBlink = now + (Math.random() < 0.2 ? 260 : 2200 + Math.random() * 3200)
      }
      const open = still ? 1 : blink((now - blinkAt) / 1000)

      L.body?.setAttribute("transform", tr(p.body.dx, p.body.dy + breathe * 0.4))
      L.head?.setAttribute(
        "transform",
        tr(p.head.dx, p.head.dy + breathe) + " rotate(" + p.head.rot.toFixed(2) + " 300 560)",
      )
      L.earL?.setAttribute("transform", tr(p.ears.dx, p.ears.dy) + " translate(138 380) scale(" + p.ears.lead.toFixed(3) + " 1) translate(-138 -380)")
      L.earR?.setAttribute("transform", tr(p.ears.dx, p.ears.dy) + " translate(462 380) scale(" + p.ears.trail.toFixed(3) + " 1) translate(-462 -380)")
      L.beanie?.setAttribute("transform", tr(p.beanie.dx, p.beanie.dy))
      L.tag?.setAttribute("transform", tr(p.tag.dx, p.tag.dy))
      L.blush?.setAttribute("transform", tr(p.blush.dx, p.blush.dy))
      L.face?.setAttribute("transform", tr(p.face.dx, p.face.dy))
      L.nose?.setAttribute("transform", tr(p.nose.dx, p.nose.dy))
      L.brows?.setAttribute("transform", tr(p.brows.dx, p.brows.dy))
      L.eyes?.setAttribute(
        "transform",
        tr(p.eyes.dx, p.eyes.dy) +
          " translate(300 350) scale(" + p.eyes.scale.toFixed(3) + " " + (p.eyes.scale * open).toFixed(3) + ") translate(-300 -350)",
      )
    }
    raf = requestAnimationFrame(frame)

    // Offscreen, the loop keeps its slot but does no work.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      prev = performance.now()
    })
    io.observe(root)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      mq.removeEventListener("change", onMq)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("blur", onLeave)
    }
  }, [])

  const chars = (s: string) =>
    Array.from(s).map((c, i) => (
      <span key={i} className="mph-ch">
        {c === " " ? " " : c}
      </span>
    ))

  const l3 = Array.from(line3)
  const l3Head = l3.slice(0, -1).join("")
  const l3Tail = l3[l3.length - 1] ?? ""
  const greeting = said >= 0 ? greetings[said % greetings.length] : greetings[0]

  const vars = {
    "--mph-accent": accent,
    "--mph-paper": paper,
    "--mph-ink": ink,
    "--mph-sans": SANS_STACK,
    "--mph-display": DISPLAY_STACK,
    height,
    minHeight,
  } as React.CSSProperties

  const pillInner = (
    <>
      {seeking}
      <em aria-hidden="true">→</em>
    </>
  )

  return (
    <div ref={rootRef} className={"mph-root" + (className ? " " + className : "")} style={vars}>
      <style>{CSS}</style>

      {/* Perspective wireframe room */}
      <svg className="mph-room" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.14">
          {ROOM.back.map((s, i) => (
            <line key={"b" + i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
          ))}
          {ROOM.rays.map((s, i) => (
            <line key={"r" + i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
          ))}
          {ROOM.depth.map((d, i) => (
            <path key={"d" + i} d={d} />
          ))}
        </g>
      </svg>

      <div className="mph-stage">
        {/* Top rule / meta bar */}
        <header className="mph-top">
          <span className="mph-index">
            <b>{index}</b>
            {discipline}
          </span>
          <span className="mph-tagline">{tagline}</span>
          <span className="mph-brace">
            {"{"}
            {collection[0]}/{collection[1]}
            {"}"}
          </span>
          <span className="mph-reel">
            <i aria-hidden="true" />
            <span>
              {reel[0]}
              <br />
              {reel[1]}
            </span>
          </span>
        </header>

        <span className="mph-rule mph-rule-l" aria-hidden="true" />
        <span className="mph-rule mph-rule-r" aria-hidden="true" />

        {/* Large Editorial Headline */}
        <h1 className="mph-h1" aria-label={[year, initials, line2, line3, word + bracketed].join(" ")}>
          <span className="mph-line" aria-hidden="true">
            {chars(year)}
            <svg className="mph-arrow" viewBox="0 0 100 100">
              <path d="M14 14 L84 84 M84 30 V84 H30" />
            </svg>
            {chars(initials)}
            <span className="mph-badge">
              {badge}
              <sup>@</sup>
            </span>
          </span>
          <span className="mph-line" aria-hidden="true">
            {chars(line2)}
          </span>
          <span className="mph-line" aria-hidden="true">
            {chars(l3Head)}
            <span className="mph-swash">
              <span className="mph-ch">{l3Tail}</span>
              <svg viewBox="0 0 255 72" preserveAspectRatio="none">
                <path
                  pathLength={1}
                  d="M6 44 C40 18 150 4 222 14 C262 20 258 48 214 58 C150 72 60 70 30 60 C10 53 20 40 60 34"
                />
              </svg>
            </span>
          </span>
          <span className="mph-line mph-l4" aria-hidden="true">
            {chars(word)}
            <span className="mph-vtag">
              <span>{verticalTag}</span>
              <i />
            </span>
            <span className="mph-bracket">
              <svg viewBox="0 0 100 120" preserveAspectRatio="none">
                <path className="mph-arc-t" vectorEffect="non-scaling-stroke" d="M4 16 Q50 -8 96 16" />
                <path className="mph-arc-b" vectorEffect="non-scaling-stroke" d="M4 104 Q50 128 96 104" />
              </svg>
              {bracketed}
            </span>
            <span className="mph-star">*</span>
          </span>
        </h1>

        {/* Decorative dynamic swirl */}
        <svg className="mph-curl" viewBox="0 0 100 100" aria-hidden="true">
          <path
            pathLength={1}
            d="M92 8 C70 6 52 22 58 40 C63 56 84 52 80 36 C76 22 50 30 40 48 C32 62 26 74 16 84 M14 66 L14 86 L34 86"
          />
        </svg>

        {/* Action Pill CTA */}
        <div className="mph-pill">
          <span className="mph-pill-a">{seekingLabel}</span>
          {href ? (
            <a className="mph-pill-b" href={href}>
              {pillInner}
            </a>
          ) : (
            <span className="mph-pill-b" tabIndex={0}>
              {pillInner}
            </span>
          )}
        </div>

        {/* Spinning flower stamp */}
        <div className="mph-flower" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <path d={FLOWER} />
            <circle cx="60" cy="60" r="4" fill="none" stroke={ink} strokeWidth="2" />
          </svg>
        </div>

        {/* Optional Verified Unsplash Stock Card */}
        {stockImage && (
          <div className="mph-stock-card" title="Clinical Bovine Benchmark">
            <img src={stockImage} alt="Clinical Cow Benchmark" />
            <div className="meta">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span>{stockImageLabel}</span>
            </div>
          </div>
        )}

        {/* Bottom clinical / services list */}
        <ul className="mph-services">
          {services.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        {/* Interactive Character: Cute Cow Mascot or Original Man */}
        <button
          ref={charRef}
          type="button"
          className={"mph-char" + (happy ? " mph-happy" : "")}
          onClick={poke}
          aria-label={character === "cow" ? "Say hi to the cute cow mascot" : "Say hi to the character"}
        >
          <svg viewBox={"0 0 " + CW + " " + CH} aria-hidden="true">
            <defs>
              {/* Shading gradients */}
              <radialGradient id={id("shade")} cx="46%" cy="40%" r="62%">
                <stop offset="0.55" stopColor="#52525b" stopOpacity="0" />
                <stop offset="1" stopColor="#18181b" stopOpacity="0.28" />
              </radialGradient>
              <radialGradient id={id("hi")} cx="36%" cy="28%" r="42%">
                <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id("blush")}>
                <stop offset="0" stopColor="#ff6f6f" stopOpacity="0.65" />
                <stop offset="1" stopColor="#ff6f6f" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id("eye")} cx="38%" cy="32%" r="70%">
                <stop offset="0" stopColor="#2c1a14" />
                <stop offset="0.6" stopColor="#160e0a" />
                <stop offset="1" stopColor="#050505" />
              </radialGradient>
              <linearGradient id={id("horn")} x1="0" y1="1" x2="0.6" y2="0">
                <stop offset="0" stopColor="#f59e0b" />
                <stop offset="0.7" stopColor="#fbbf24" />
                <stop offset="1" stopColor="#fef08a" />
              </linearGradient>
              <linearGradient id={id("horn-shade")} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#000" stopOpacity="0" />
                <stop offset="1" stopColor="#78350f" stopOpacity="0.45" />
              </linearGradient>
              <radialGradient id={id("snout")} cx="46%" cy="36%" r="65%">
                <stop offset="0" stopColor="#fed7aa" stopOpacity="0.3" />
                <stop offset="0.6" stopColor="#f472b6" stopOpacity="0.2" />
                <stop offset="1" stopColor="#e11d48" stopOpacity="0.3" />
              </radialGradient>
              <linearGradient id={id("bell")} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fde047" />
                <stop offset="0.5" stopColor="#eab308" />
                <stop offset="1" stopColor="#ca8a04" />
              </linearGradient>
            </defs>

            {/* Floor contact shadow */}
            <ellipse cx="300" cy="712" rx="250" ry="16" fill="#000" opacity="0.1" />

            {character === "cow" ? (
              /* ==================== CUTE COW MASCOT ==================== */
              <>
                {/* Body & Collar & Bell */}
                <g ref={set("body")}>
                  {/* Chubby dairy cow torso */}
                  <path
                    d="M38 730 C48 628 114 584 206 576 L394 576 C486 584 552 628 562 730 Z"
                    fill="#fbfbf9"
                    stroke="#27272a"
                    strokeWidth="3.5"
                  />
                  {/* Organic cow spots on body */}
                  <path
                    d="M48 720 C60 660 115 640 160 670 C190 690 195 725 180 730 Z"
                    fill="#27272a"
                  />
                  <path
                    d="M440 640 C490 615 540 635 555 700 L545 730 C490 730 455 700 440 640 Z"
                    fill="#27272a"
                  />
                  {/* Cow neck */}
                  <path
                    d="M242 490 L358 490 L368 590 Q300 618 232 590 Z"
                    fill="#fbfbf9"
                    stroke="#27272a"
                    strokeWidth="3.5"
                  />
                  {/* Emerald Vet Bandana / Collar */}
                  <path
                    d="M216 572 Q300 622 384 572 Q300 638 216 572 Z"
                    fill={accent}
                    stroke="#111827"
                    strokeWidth="3"
                  />
                  {/* Golden Cow Bell */}
                  <g transform="translate(0, 0)">
                    <circle cx="300" cy="626" r="8" fill="none" stroke="#ca8a04" strokeWidth="3" />
                    <path
                      d="M285 632 C285 620 315 620 315 632 L320 660 C320 666 280 666 280 660 Z"
                      fill={u("bell")}
                      stroke="#854d0e"
                      strokeWidth="2"
                    />
                    <circle cx="300" cy="664" r="5" fill="#854d0e" />
                  </g>
                </g>

                {/* Head, Horns, Ears, Face, Snout */}
                <g ref={set("head")}>
                  {/* Left Floppy Ear */}
                  <g ref={set("earL")}>
                    <g transform="rotate(-18 138 380)">
                      <ellipse cx="138" cy="380" rx="60" ry="38" fill="#fbfbf9" stroke="#27272a" strokeWidth="3.5" />
                      <ellipse cx="138" cy="380" rx="42" ry="24" fill="#fda4af" opacity="0.9" />
                      <ellipse cx="138" cy="380" rx="42" ry="24" fill={u("snout")} />
                    </g>
                  </g>

                  {/* Right Floppy Ear (Dark cow patch ear) */}
                  <g ref={set("earR")}>
                    <g transform="rotate(18 462 380)">
                      <ellipse cx="462" cy="380" rx="60" ry="38" fill="#27272a" stroke="#18181b" strokeWidth="3.5" />
                      <ellipse cx="462" cy="380" rx="42" ry="24" fill="#fb7185" opacity="0.8" />
                    </g>
                  </g>

                  {/* Bovine Horns */}
                  <g>
                    {/* Left Horn */}
                    <path
                      d="M205 185 C175 145 135 125 110 95 C140 108 185 138 230 172 Z"
                      fill={u("horn")}
                      stroke="#92400e"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M205 185 C175 145 135 125 110 95 C140 108 185 138 230 172 Z"
                      fill={u("horn-shade")}
                    />
                    {/* Right Horn */}
                    <path
                      d="M395 185 C425 145 465 125 490 95 C460 108 415 138 370 172 Z"
                      fill={u("horn")}
                      stroke="#92400e"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M395 185 C425 145 465 125 490 95 C460 108 415 138 370 172 Z"
                      fill={u("horn-shade")}
                    />
                  </g>

                  {/* Main Head Base */}
                  <path
                    d="M300 135 C420 135 480 220 480 355 C480 485 395 565 300 565 C205 565 120 485 120 355 C120 220 180 135 300 135 Z"
                    fill="#fbfbf9"
                    stroke="#27272a"
                    strokeWidth="4"
                  />
                  <path
                    d="M300 135 C420 135 480 220 480 355 C480 485 395 565 300 565 C205 565 120 485 120 355 C120 220 180 135 300 135 Z"
                    fill={u("shade")}
                  />
                  <path
                    d="M300 135 C420 135 480 220 480 355 C480 485 395 565 300 565 C205 565 120 485 120 355 C120 220 180 135 300 135 Z"
                    fill={u("hi")}
                  />

                  {/* Dairy cow facial patch over right eye */}
                  <path
                    d="M300 135 C380 135 450 170 472 260 C482 320 452 390 395 410 C345 425 315 375 315 315 C315 235 285 178 300 135 Z"
                    fill="#27272a"
                  />

                  {/* Cute fluffy white tuft of hair on top of head */}
                  <path
                    d="M260 145 C250 115 285 110 300 120 C315 110 350 115 340 145 C325 155 275 155 260 145 Z"
                    fill="#ffffff"
                    stroke="#27272a"
                    strokeWidth="3"
                  />

                  {/* Cheeks Blush */}
                  <g ref={set("blush")}>
                    <ellipse cx="185" cy="425" rx={happy ? 52 : 44} ry={happy ? 36 : 28} fill={u("blush")} />
                    <ellipse cx="415" cy="425" rx={happy ? 52 : 44} ry={happy ? 36 : 28} fill={u("blush")} />
                  </g>

                  {/* Face: Eyes, Brows, Nose/Snout */}
                  <g ref={set("face")}>
                    {/* Eyebrows */}
                    <g ref={set("brows")}>
                      <path
                        d={happy ? "M195 280 Q230 256 265 272" : "M195 288 Q230 270 265 282"}
                        fill="none"
                        stroke="#27272a"
                        strokeWidth="18"
                        strokeLinecap="round"
                      />
                      <path
                        d={happy ? "M335 272 Q370 256 405 280" : "M335 282 Q370 270 405 288"}
                        fill="none"
                        stroke="#f4f4f5"
                        strokeWidth="18"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* Big Cute Expressive Anime Cow Eyes */}
                    <g ref={set("eyes")}>
                      {happy ? (
                        <>
                          <path
                            d="M212 348 Q238 316 264 348"
                            fill="none"
                            stroke="#18181b"
                            strokeWidth="14"
                            strokeLinecap="round"
                          />
                          <path
                            d="M336 348 Q362 316 388 348"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="14"
                            strokeLinecap="round"
                          />
                        </>
                      ) : (
                        <>
                          {/* Left Eye */}
                          <ellipse cx="238" cy="336" rx="27" ry="32" fill="#ffffff" stroke="#27272a" strokeWidth="2.5" />
                          <ellipse cx="238" cy="336" rx="24" ry="29" fill={u("eye")} />
                          <circle cx="229" cy="324" r="8.5" fill="#ffffff" />
                          <circle cx="248" cy="348" r="3.5" fill="#ffffff" opacity="0.85" />

                          {/* Right Eye */}
                          <ellipse cx="362" cy="336" rx="27" ry="32" fill="#ffffff" stroke="#27272a" strokeWidth="2.5" />
                          <ellipse cx="362" cy="336" rx="24" ry="29" fill={u("eye")} />
                          <circle cx="353" cy="324" r="8.5" fill="#ffffff" />
                          <circle cx="372" cy="348" r="3.5" fill="#ffffff" opacity="0.85" />
                        </>
                      )}
                    </g>

                    {/* Cute Star on left cheek */}
                    <path
                      d="M175 385 L178.5 394 L188 394.5 L180.6 400.5 L183.2 409.8 L175 404.5 L166.8 409.8 L169.4 400.5 L162 394.5 L171.5 394 Z"
                      fill="#f59e0b"
                    />

                    {/* Cute Big Pink Cow Muzzle & Nose */}
                    <g ref={set("nose")}>
                      {/* Muzzle shadow */}
                      <ellipse cx="300" cy="466" rx="100" ry="60" fill="#000" opacity="0.1" />

                      {/* Main Muzzle Shape */}
                      <rect
                        x="195"
                        y="410"
                        width="210"
                        height="115"
                        rx="57"
                        fill="#fbcfe8"
                        stroke="#be185d"
                        strokeWidth="3.5"
                      />
                      <rect
                        x="195"
                        y="410"
                        width="210"
                        height="115"
                        rx="57"
                        fill={u("snout")}
                      />
                      {/* Muzzle highlight */}
                      <ellipse cx="260" cy="428" rx="35" ry="12" fill="#ffffff" opacity="0.5" />

                      {/* Nostrils */}
                      <ellipse
                        cx="255"
                        cy="452"
                        rx="13"
                        ry="9"
                        fill="#be185d"
                        opacity="0.8"
                        transform="rotate(-10 255 452)"
                      />
                      <ellipse
                        cx="345"
                        cy="452"
                        rx="13"
                        ry="9"
                        fill="#be185d"
                        opacity="0.8"
                        transform="rotate(10 345 452)"
                      />

                      {/* Mouth: Wide smiling moo when happy, sweet grin when resting */}
                      {happy ? (
                        <g transform="translate(300 488) scale(1.08 1.15) translate(-300 -488)">
                          <path
                            d="M260 480 Q300 528 340 480 Q300 540 260 480 Z"
                            fill="#881337"
                            stroke="#be185d"
                            strokeWidth="2.5"
                          />
                          <ellipse cx="300" cy="508" rx="20" ry="11" fill="#f43f5e" />
                        </g>
                      ) : (
                        <path
                          d="M272 485 Q300 504 328 485"
                          fill="none"
                          stroke="#be185d"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      )}
                    </g>
                  </g>

                  {/* Yellow Veterinary Ear Tag on Left Ear with Wiggle */}
                  <g ref={set("tag")}>
                    <g className="mph-tagwig">
                      <g transform="translate(110 380) rotate(-8)">
                        {/* Tag Attachment Clip */}
                        <circle cx="15" cy="8" r="4.5" fill="#713f12" />
                        <rect
                          x="0"
                          y="10"
                          width="30"
                          height="44"
                          rx="6"
                          fill={tag}
                          stroke="#a16207"
                          strokeWidth="2"
                        />
                        <rect
                          x="3"
                          y="13"
                          width="24"
                          height="38"
                          rx="4"
                          fill="none"
                          stroke="#ffffff"
                          strokeOpacity="0.6"
                          strokeWidth="1.4"
                          strokeDasharray="2 2"
                        />
                        <text
                          x="15"
                          y="34"
                          textAnchor="middle"
                          fontFamily="monospace"
                          fontSize="9"
                          fontWeight="900"
                          fill="#713f12"
                        >
                          #042
                        </text>
                        <text
                          x="15"
                          y="45"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                          fontSize="7"
                          fontWeight="800"
                          fill="#854d0e"
                        >
                          VET
                        </text>
                      </g>
                    </g>
                  </g>
                </g>
              </>
            ) : (
              /* ==================== ORIGINAL HUMAN CHARACTER ==================== */
              <>
                <g ref={set("body")}>
                  <path d="M28 730 C40 646 104 604 206 588 L394 588 C496 604 560 646 572 730 Z" fill={shirt} />
                  <path d="M246 500 L354 500 L360 600 Q300 624 240 600 Z" fill={skin} />
                  <path d="M236 566 Q262 604 300 628 L250 668 Q214 628 194 594 Z" fill={shirt} />
                  <path d="M364 566 Q338 604 300 628 L350 668 Q386 628 406 594 Z" fill={shirt} />
                </g>
                <g ref={set("head")}>
                  <g ref={set("earL")}>
                    <ellipse cx="138" cy="380" rx="46" ry="60" fill={skin} />
                  </g>
                  <g ref={set("earR")}>
                    <ellipse cx="462" cy="380" rx="46" ry="60" fill={skin} />
                  </g>
                  <path d="M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z" fill={skin} />
                  <g ref={set("face")}>
                    <g ref={set("brows")}>
                      <path d="M198 300 Q230 282 264 294" fill="none" stroke="#3b2518" strokeWidth="22" strokeLinecap="round" />
                      <path d="M336 294 Q370 282 402 300" fill="none" stroke="#3b2518" strokeWidth="22" strokeLinecap="round" />
                    </g>
                    <g ref={set("eyes")}>
                      <ellipse cx="240" cy="350" rx="25" ry="31" fill={u("eye")} />
                      <circle cx="231" cy="336" r="8.5" fill="#fff" />
                      <ellipse cx="360" cy="350" rx="25" ry="31" fill={u("eye")} />
                      <circle cx="351" cy="336" r="8.5" fill="#fff" />
                    </g>
                    <g ref={set("nose")}>
                      <ellipse cx="300" cy="398" rx="29" ry="26" fill={skin} />
                    </g>
                  </g>
                </g>
              </>
            )}
          </svg>

          {/* Speech bubble */}
          <span className="mph-bubble" data-on={happy ? "true" : "false"} aria-live="polite">
            {greeting}
          </span>
        </button>
      </div>
    </div>
  )
}
