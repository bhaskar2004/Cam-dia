import { useState } from 'react';
import GridOverlay from './GridOverlay';
import { capturePhoto, COLORS, type GridSettings } from './grid';
import { useCamera } from './useCamera';

const INITIAL: GridSettings = { visible: true, diagonal: true, orthogonal: false, color: 'white', opacity: 65, thickness: 1.25, spacing: 'medium' };

export default function App() {
  const cam = useCamera();
  const [grid, setGrid] = useState(INITIAL);
  const [open, setOpen] = useState(false);
  const [withGrid, setWithGrid] = useState(true);
  const [photo, setPhoto] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  const update = (patch: Partial<GridSettings>) => setGrid((g) => ({ ...g, ...patch }));
  const live = cam.status === 'live';

  const capture = () => {
    const video = cam.videoRef.current;
    if (!video?.videoWidth) return;
    try {
      const canvas = capturePhoto(video, cam.mirrored, withGrid ? grid : null);
      setPhoto({ canvas, url: canvas.toDataURL('image/png') });
      setOpen(false);
    } catch { cam.setError('Couldn’t capture the photo. Try again.'); }
  };

  const download = (type: 'png' | 'jpeg') => photo?.canvas.toBlob((blob) => {
    if (!blob) { cam.setError('Couldn’t save the photo. Try the other format.'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grid-photo-${Date.now()}.${type === 'png' ? 'png' : 'jpg'}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, `image/${type}`, 0.95);

  return (
    <main className="app">
      <section className="stage" aria-label="Camera preview">
        <video ref={cam.videoRef} className={`layer ${cam.mirrored ? 'mirrored' : ''}`} autoPlay muted playsInline />
        <GridOverlay grid={grid} />
        {!live && (
          <div className="welcome">
            <h1>Diagonal Grid Camera</h1>
            <p>Your video stays on this device.</p>
            <button className="primary" disabled={cam.status === 'starting'} onClick={() => cam.start()}>
              {cam.status === 'starting' ? 'Waiting for camera…' : 'Start camera'}
            </button>
          </div>
        )}
        {cam.error && <div className="toast" role="alert"><span>{cam.error}</span><button onClick={() => cam.setError('')}>Dismiss</button></div>}
      </section>

      {open && (
        <aside className="panel" aria-label="Grid settings">
          <header><h2>Grid settings</h2><button onClick={() => setOpen(false)}>Done</button></header>
          <Switch label="Diagonal lines" checked={grid.diagonal} onChange={(diagonal) => update({ diagonal })} />
          <Switch label="Horizontal and vertical" checked={grid.orthogonal} onChange={(orthogonal) => update({ orthogonal })} />
          <fieldset><legend>Color</legend><div className="row">
            {(Object.keys(COLORS) as GridSettings['color'][]).map((c) => (
              <button key={c} className="swatch" style={{ background: COLORS[c] }} aria-label={c} aria-pressed={grid.color === c} onClick={() => update({ color: c })} />
            ))}
          </div></fieldset>
          <label>Opacity: {grid.opacity}%
            <input type="range" min="0" max="100" value={grid.opacity} onChange={(e) => update({ opacity: +e.target.value })} />
          </label>
          <label>Thickness: {grid.thickness}px
            <input type="range" min="0.5" max="6" step="0.25" value={grid.thickness} onChange={(e) => update({ thickness: +e.target.value })} />
          </label>
          <fieldset><legend>Spacing</legend><div className="segment">
            {(['small', 'medium', 'large'] as const).map((s) => (
              <button key={s} aria-pressed={grid.spacing === s} onClick={() => update({ spacing: s })}>{s}</button>
            ))}
          </div></fieldset>
        </aside>
      )}

      <footer>
        <div className="segment mode" role="group" aria-label="Capture mode">
          <button aria-pressed={!withGrid} onClick={() => setWithGrid(false)}>Original</button>
          <button aria-pressed={withGrid} onClick={() => setWithGrid(true)}>Include grid</button>
        </div>
        <nav className="dock">
          <button aria-pressed={grid.visible} onClick={() => update({ visible: !grid.visible })}>Grid</button>
          <button disabled={!cam.canSwitch} onClick={cam.switchCamera}>Switch</button>
          <button className="shutter" aria-label="Capture photo" disabled={!live} onClick={capture} />
          <button onClick={() => (cam.status === 'idle' ? cam.start() : cam.stop())}>{cam.status === 'idle' ? 'Start' : 'Stop'}</button>
          <button aria-expanded={open} onClick={() => setOpen(!open)}>Settings</button>
        </nav>
      </footer>

      {photo && (
        <div className="review" role="dialog" aria-modal="true" aria-label="Captured photo">
          <img src={photo.url} alt="Your captured photo" />
          <div className="row">
            <button className="primary" onClick={() => download('png')}>Download PNG</button>
            <button className="primary" onClick={() => download('jpeg')}>Download JPEG</button>
            <button autoFocus onClick={() => setPhoto(null)}>Back to camera</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="switch">{label}<input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
}
