import React, { useEffect, useRef, useState } from 'react';

type Heart = {
  id: number;
  tx: number;
  ty: number;
  size: number;
  rotation: number;
  duration: number;
};

export default function MofuSpinner({ imgSrc, onSpecialClick, special }: { imgSrc: string; onSpecialClick?: () => void; special?: boolean }) {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // play a meow sound (clone node so multiple clicks can overlap)
  function playMeow() {
    try {
      if (!audioRef.current) return;
      const node = audioRef.current.cloneNode(true) as HTMLAudioElement;
      node.volume = 0.9;
      void node.play().catch(() => {});
    } catch {}
  }

  // physics refs
  const angleRef = useRef(0); // degrees
  const velocityRef = useRef(0); // degrees per second
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // holding state for press-and-hold acceleration
  const holdingRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);

  // parameters (tweak to taste)
  // scaled down by ~25% to reduce overall spinning speed
  const TAP_IMPULSE_MIN = 90; // per-click impulse (deg/s) — was 120
  const TAP_IMPULSE_VAR = 60; // variability per click — was 80
  const HOLD_ACCEL = 900; // deg/s^2 added while holding — was 1200
  const FRICTION = 1.2; // keep decay similar

  // emitter accumulation
  const spawnAccRef = useRef(0);
  const idRef = useRef(1);

  // keep step function in a ref so it can be started/stopped from handlers
  const stepRef = useRef<(now: number) => void>();

  useEffect(() => {
    // initialize audio (expects /meow.mp3 in public)
    try {
      audioRef.current = new Audio(process.env.PUBLIC_URL + '/meow.mp3');
      audioRef.current.preload = 'auto';
    } catch {}

    // ensure img has correct transform origin for rotation
    if (imgRef.current) {
      imgRef.current.style.transformOrigin = '50% 50%';
      imgRef.current.style.willChange = 'transform';
    }

    stepRef.current = function step(now: number) {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000); // clamp dt
      lastTimeRef.current = now;

      // if holding, apply continuous acceleration
      if (holdingRef.current) {
        velocityRef.current += HOLD_ACCEL * dt;
      }

      // physics: exponential decay (friction)
      velocityRef.current *= Math.exp(-FRICTION * dt);

      // integrate angle (do NOT wrap with %360 to allow continuous rotation)
      angleRef.current = angleRef.current + velocityRef.current * dt;

      // apply transform directly to avoid re-rendering each frame
      if (imgRef.current) {
        imgRef.current.style.transform = `rotate(${angleRef.current}deg)`;
      }

      // Heart emission based on speed
      const speed = Math.abs(velocityRef.current); // deg/sec
      const baseRate = 0.02; // hearts per second at rest (very low)
      const speedFactor = 0.006; // additional hearts per deg/sec
      const rate = Math.max(0, baseRate + speed * speedFactor);
      const spawnInterval = 1 / Math.max(rate, 0.001);

      spawnAccRef.current += dt;
      // Only emit when spinning noticeably
      while (spawnAccRef.current >= spawnInterval && speed > 10) {
        spawnAccRef.current -= spawnInterval;
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 140;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance - 30;
        const size = 12 + Math.random() * 28;
        const rotation = Math.random() * 360;
        const duration = 800 + Math.random() * 900;
        const id = idRef.current++;
        setHearts((s) => [...s, { id, tx, ty, size, rotation, duration }]);
      }

      // continue or stop loop
      if (Math.abs(velocityRef.current) > 0.01 || holdingRef.current) {
        rafRef.current = window.requestAnimationFrame(stepRef.current!);
      } else {
        rafRef.current = null;
        lastTimeRef.current = null;
      }
    };

    // start the loop once so it can run when clicks/holds happen
    if (rafRef.current == null) {
      rafRef.current = window.requestAnimationFrame(stepRef.current!);
    }

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  function ensureRAF() {
    if (rafRef.current == null) {
      lastTimeRef.current = null;
      rafRef.current = window.requestAnimationFrame(stepRef.current!);
    }
  }

  function startHold() {
    holdingRef.current = true;
    holdStartRef.current = performance.now();
    ensureRAF();
  }

  function endHold() {
    holdingRef.current = false;
    const now = performance.now();
    const start = holdStartRef.current ?? now;
    const duration = Math.max(0, now - start);
    holdStartRef.current = null;

    // if it was a short tap, apply a tap impulse
    const TAP_THRESHOLD = 180; // ms
    if (duration < TAP_THRESHOLD) {
      const impulse = TAP_IMPULSE_MIN + Math.random() * TAP_IMPULSE_VAR;
      velocityRef.current += impulse;
    }

    ensureRAF();
  }

  function onPointerDown(e: React.PointerEvent) {
    // play meow on interaction except for the special letter image
    if (!special) {
      playMeow();
    }
    // trigger special action if this is the special image
    if (special && typeof onSpecialClick === 'function') {
      try { onSpecialClick(); } catch {}
    }
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}
    startHold();

    // small immediate visual heart burst for feedback
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 60;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 20;
      const size = 12 + Math.random() * 18;
      const rotation = Math.random() * 360;
      const duration = 600 + Math.random() * 500;
      const id = idRef.current++;
      setHearts((s) => [...s, { id, tx, ty, size, rotation, duration }]);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
    endHold();
  }

  function onPointerCancel() {
    holdingRef.current = false;
    holdStartRef.current = null;
  }

  // mouse / touch fallbacks
  function onMouseDown() { startHold(); }
  function onMouseUp() { endHold(); }
  function onTouchStart() { startHold(); }
  function onTouchEnd() { endHold(); }

  function removeHeart(id: number) {
    setHearts((s) => s.filter((h) => h.id !== id));
  }

  return (
    <div className={`spinner-root`}>
      <div
        className="spinner-container"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="button"
        tabIndex={0}
      >
        <div className="mofu-wrap">
          <img ref={imgRef} src={imgSrc} alt="mofusand" className="mofu" />
        </div>
        {/* pivot is placed here so it is centered relative to the spinner container (circle) */}
        <div className="pivot" aria-hidden="true" />
      </div>

      {hearts.map((h) => (
        <div
          key={h.id}
          className="heart"
          style={{
            left: '50%',
            top: '50%',
            ['--tx' as any]: `${h.tx}px`,
            ['--ty' as any]: `${h.ty}px`,
            ['--size' as any]: `${h.size}px`,
            ['--rot' as any]: `${h.rotation}deg`,
            ['--dur' as any]: `${h.duration}ms`,
          } as React.CSSProperties}
          onAnimationEnd={() => removeHeart(h.id)}
        />
      ))}
    </div>
  );
}
