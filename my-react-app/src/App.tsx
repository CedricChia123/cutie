import React, { useMemo, useRef, useState, useEffect } from 'react';
import Header from './components/Header';
import MofuSpinner from './components/MofuSpinner';

const App: React.FC = () => {
  // list of available mofusand images (public folder). Add the real files later.
  const images = useMemo(() => [
    process.env.PUBLIC_URL + '/mofusand.png',
    process.env.PUBLIC_URL + '/mofusand-2.png',
    process.env.PUBLIC_URL + '/mofusand-3.png',
    process.env.PUBLIC_URL + '/mofusand-4.png',
    process.env.PUBLIC_URL + '/mofusand-5.png',
    process.env.PUBLIC_URL + '/mofusand-6.png',
    process.env.PUBLIC_URL + '/mofusand-7.png',
    process.env.PUBLIC_URL + '/mofusand-8.png',
    process.env.PUBLIC_URL + '/mofusand-9.png',
    process.env.PUBLIC_URL + '/letter.png',
  ], []);

  const [current, setCurrent] = useState<string>(images[0]);
  const [showProposal, setShowProposal] = useState(false);

  // Yes button growth state
  const [yesScale, setYesScale] = useState(1);
  const yesRef = useRef<HTMLButtonElement | null>(null);
  const maybeRef = useRef<HTMLButtonElement | null>(null);
  const growingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [maybeDisabled, setMaybeDisabled] = useState(false);
  // keep a ref mirror of yesScale so the RAF callback can read latest value synchronously
  const yesScaleRef = useRef<number>(1);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function changeImage() {
    if (images.length < 2) return; // nothing to change to
    const idx = images.indexOf(current);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % images.length;
    setCurrent(images[nextIdx]);
  }

  function handleSpecial() {
    // only trigger when current is the special letter
    if (current === process.env.PUBLIC_URL + '/letter.png') {
      setShowProposal(true);
      // reset any previous growth state
      setYesScale(1);
      yesScaleRef.current = 1;
      setMaybeDisabled(false);
      growingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }

  function checkOverlap(): boolean {
    const yesEl = yesRef.current;
    const maybeEl = maybeRef.current;
    if (!yesEl || !maybeEl) return false;
    const yRect = yesEl.getBoundingClientRect();
    const mRect = maybeEl.getBoundingClientRect();
    return !(yRect.right < mRect.left || yRect.left > mRect.right || yRect.bottom < mRect.top || yRect.top > mRect.bottom);
  }

  function growStep(prevTime: number | null, now: number) {
    const dt = prevTime ? (now - prevTime) / 1000 : 0.016;
    // increase scale (pixels per second equivalent)
    setYesScale((s) => {
      const next = s + 0.9 * dt; // grow ~0.9 per second
      // mirror to ref so RAF loop can synchronously read the latest scale
      yesScaleRef.current = next;
      return next;
    });

    // check overlap on next frame
    rafRef.current = requestAnimationFrame((t) => {
      // only consider overlap after we have actually grown a bit to avoid immediate disabling
      if (yesScaleRef.current > 1.02 && checkOverlap()) {
        // stop and disable maybe later
        growingRef.current = false;
        setMaybeDisabled(true);
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        return;
      }
      if (growingRef.current) {
        growStep(now, performance.now());
      }
    });
  }

  function onMaybeLaterClick() {
    if (maybeDisabled) return;
    // start growing yes button
    if (!growingRef.current) {
      growingRef.current = true;
      // ensure RAF
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // seed the growth loop; first growStep will use a small timestep
      rafRef.current = requestAnimationFrame((t) => growStep(null, performance.now()));
    }
  }

  function onYesClick() {
    // user accepted — close popup
    setShowProposal(false);
    // reset growth state
    setYesScale(1);
    yesScaleRef.current = 1;
    setMaybeDisabled(false);
    growingRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }

  return (
    <div className="container app-root">

      <Header title="" subtitle="Mofusand" />

      <main className="main-content">
        <MofuSpinner imgSrc={current} special={current === process.env.PUBLIC_URL + '/letter.png'} onSpecialClick={handleSpecial} />
      </main>

      <div className="controls">
        <button className="button" onClick={changeImage} disabled={images.length < 2}>
          Change
        </button>
      </div>

      {showProposal && (
        <div className="proposal-popup">
          <div className="proposal-card">
            <h2>Will you be my gf?</h2>
            <p className="proposal-sub">Press yes if you'd like adventures tgt 💫</p>
            <div className="proposal-actions">
              <button
                ref={yesRef}
                className="button"
                onClick={onYesClick}
                style={{ transform: `scale(${yesScale})`, transition: 'transform 80ms linear' }}
              >
                Yes
              </button>
              <button
                ref={maybeRef}
                className="button"
                onClick={onMaybeLaterClick}
                disabled={maybeDisabled}
                style={{ opacity: maybeDisabled ? 0.35 : 1 }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;