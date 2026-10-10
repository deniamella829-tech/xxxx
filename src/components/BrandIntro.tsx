import { useEffect, useRef, useState } from "react";

interface Props {
  onFinish: () => void;
  duration?: number; // ms
}

/**
 * Intro animado de X Pornazo.
 * - Whoosh ascendente sincronizado con el barrido
 * - Bass hit + click cuando el logo aterriza
 * - Shimmer pulsante durante el hold
 * - Sub descendente al fade-out
 */
const BrandIntro = ({ onFinish, duration = 3400 }: Props) => {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const finishedRef = useRef(false);

  useEffect(() => {
    let ctx: AudioContext | null = null;
    const totalSec = duration / 1000;
    const landSec = 0.95; // momento en que el logo "aterriza"
    const outSec = totalSec - 0.5;

    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      // ---------- 1) Whoosh ascendente sincronizado con el barrido (0 → land) ----------
      const whooshDur = landSec;
      const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * whooshDur), ctx.sampleRate);
      const ndata = noiseBuf.getChannelData(0);
      for (let i = 0; i < ndata.length; i++) ndata[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const nFilt = ctx.createBiquadFilter();
      nFilt.type = "bandpass";
      nFilt.Q.value = 1.2;
      nFilt.frequency.setValueAtTime(300, now);
      nFilt.frequency.exponentialRampToValueAtTime(4500, now + whooshDur);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.exponentialRampToValueAtTime(0.45, now + whooshDur * 0.85);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + whooshDur + 0.05);
      noise.connect(nFilt).connect(nGain).connect(master);
      noise.start(now);
      noise.stop(now + whooshDur + 0.1);

      // Riser tonal acompañando el whoosh
      const riser = ctx.createOscillator();
      riser.type = "sawtooth";
      riser.frequency.setValueAtTime(80, now);
      riser.frequency.exponentialRampToValueAtTime(900, now + whooshDur);
      const riserGain = ctx.createGain();
      riserGain.gain.setValueAtTime(0.0001, now);
      riserGain.gain.exponentialRampToValueAtTime(0.18, now + whooshDur * 0.9);
      riserGain.gain.exponentialRampToValueAtTime(0.0001, now + whooshDur + 0.05);
      const riserFilt = ctx.createBiquadFilter();
      riserFilt.type = "lowpass";
      riserFilt.frequency.value = 1800;
      riser.connect(riserFilt).connect(riserGain).connect(master);
      riser.start(now);
      riser.stop(now + whooshDur + 0.1);

      // ---------- 2) IMPACTO al aterrizar el logo ----------
      const hit = now + landSec;
      // Sub-bass
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(220, hit);
      sub.frequency.exponentialRampToValueAtTime(40, hit + 0.45);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.0001, hit);
      subGain.gain.exponentialRampToValueAtTime(0.85, hit + 0.02);
      subGain.gain.exponentialRampToValueAtTime(0.0001, hit + 0.9);
      sub.connect(subGain).connect(master);
      sub.start(hit);
      sub.stop(hit + 0.95);

      // Click metálico
      const click = ctx.createOscillator();
      click.type = "square";
      click.frequency.setValueAtTime(1200, hit);
      click.frequency.exponentialRampToValueAtTime(400, hit + 0.1);
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.3, hit);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, hit + 0.12);
      click.connect(clickGain).connect(master);
      click.start(hit);
      click.stop(hit + 0.15);

      // Burst de ruido (impacto)
      const impBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
      const idata = impBuf.getChannelData(0);
      for (let i = 0; i < idata.length; i++) idata[i] = (Math.random() * 2 - 1) * (1 - i / idata.length);
      const imp = ctx.createBufferSource();
      imp.buffer = impBuf;
      const impGain = ctx.createGain();
      impGain.gain.value = 0.4;
      imp.connect(impGain).connect(master);
      imp.start(hit);

      // ---------- 3) Shimmer durante el hold (sincronizado con el pulse) ----------
      const shimmerStart = hit + 0.25;
      const shimmerEnd = now + outSec;
      const shimmer = ctx.createOscillator();
      shimmer.type = "triangle";
      shimmer.frequency.value = 660;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 1 / 1.2; // mismo ritmo que el pulse (1.2s)
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 80;
      lfo.connect(lfoGain).connect(shimmer.frequency);
      const shGain = ctx.createGain();
      shGain.gain.setValueAtTime(0.0001, shimmerStart);
      shGain.gain.exponentialRampToValueAtTime(0.08, shimmerStart + 0.3);
      shGain.gain.setValueAtTime(0.08, shimmerEnd - 0.2);
      shGain.gain.exponentialRampToValueAtTime(0.0001, shimmerEnd);
      shimmer.connect(shGain).connect(master);
      shimmer.start(shimmerStart);
      lfo.start(shimmerStart);
      shimmer.stop(shimmerEnd + 0.05);
      lfo.stop(shimmerEnd + 0.05);

      // ---------- 4) Sub descendente al salir ----------
      const outHit = now + outSec;
      const outOsc = ctx.createOscillator();
      outOsc.type = "sine";
      outOsc.frequency.setValueAtTime(120, outHit);
      outOsc.frequency.exponentialRampToValueAtTime(30, outHit + 0.5);
      const outGain = ctx.createGain();
      outGain.gain.setValueAtTime(0.0001, outHit);
      outGain.gain.exponentialRampToValueAtTime(0.45, outHit + 0.05);
      outGain.gain.exponentialRampToValueAtTime(0.0001, outHit + 0.55);
      outOsc.connect(outGain).connect(master);
      outOsc.start(outHit);
      outOsc.stop(outHit + 0.6);
    } catch {
      /* sin audio */
    }

    const t1 = setTimeout(() => setPhase("hold"), landSec * 1000);
    const t2 = setTimeout(() => setPhase("out"), duration - 500);
    const t3 = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish();
      }
      ctx?.close().catch(() => {});
    }, duration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ctx?.close().catch(() => {});
    };
  }, [duration, onFinish]);

  const handleSkip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  return (
    <div
      onClick={handleSkip}
      className={`absolute inset-0 z-20 flex items-center justify-center bg-black overflow-hidden cursor-pointer ${
        phase === "out" ? "intro-fade-out" : ""
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.35),transparent_60%)] intro-pulse" />
      <div className="absolute inset-0 intro-sweep bg-[linear-gradient(110deg,transparent_40%,hsl(var(--primary)/0.25)_50%,transparent_60%)]" />

      <div className={`relative flex items-center gap-2 md:gap-3 ${phase === "in" ? "intro-logo-in" : "intro-logo-hold"}`}>
        <span
          className="text-6xl md:text-8xl font-extrabold text-primary drop-shadow-[0_0_25px_hsl(var(--primary)/0.8)]"
          style={{ letterSpacing: "-0.05em" }}
        >
          X
        </span>
        <span
          className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight"
          style={{ textShadow: "0 0 20px rgba(255,255,255,0.4)" }}
        >
          Pornazo
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="absolute bottom-4 right-4 text-xs text-white/60 hover:text-white px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition"
      >
        Saltar intro
      </button>

      <style>{`
        @keyframes introLogoIn {
          0%   { opacity: 0; transform: scale(0.3) rotate(-8deg); filter: blur(20px); }
          70%  { opacity: 1; transform: scale(1.18) rotate(0deg); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes introPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes introSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes introFadeOut {
          to { opacity: 0; }
        }
        .intro-logo-in   { animation: introLogoIn 0.95s cubic-bezier(.2,.9,.25,1.2) both; }
        .intro-logo-hold { animation: introPulse 1.2s ease-in-out infinite; }
        .intro-pulse     { animation: introPulse 1.6s ease-in-out infinite; }
        .intro-sweep     { animation: introSweep 0.95s ease-out forwards; }
        .intro-fade-out  { animation: introFadeOut 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default BrandIntro;
