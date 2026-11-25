import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT: MediaTrackConstraints = { facingMode: { ideal: 'user' } };
type Result = 'ok' | 'failed' | 'cancelled';

function explain(error: unknown) {
  switch (error instanceof DOMException ? error.name : '') {
    case 'NotAllowedError': return 'Camera access is blocked. Allow it in your browser’s site settings (and system privacy settings), then try again.';
    case 'SecurityError': return 'Your browser’s security settings blocked the camera.';
    case 'NotFoundError': return 'No camera found. Connect one, then try again.';
    case 'NotReadableError': return 'The camera is unavailable. Close other apps using it, then try again.';
    case 'OverconstrainedError': return 'That camera is unavailable. Try starting again.';
    default: return 'The camera couldn’t start. Try again.';
  }
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const sourceRef = useRef(DEFAULT);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live'>('idle');
  const [error, setError] = useState('');
  const [mirrored, setMirrored] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    requestRef.current++; // cancels any pending request
    release();
    setStatus('idle');
  }, [release]);

  const start = useCallback(async (source = sourceRef.current): Promise<Result> => {
    if (!window.isSecureContext) { setError('Camera access needs HTTPS or localhost.'); return 'failed'; }
    if (!navigator.mediaDevices?.getUserMedia) { setError('This browser doesn’t support camera access. Try a current Chrome, Safari, Edge or Firefox.'); return 'failed'; }
    const id = ++requestRef.current;
    release();
    setStatus('starting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { ...source, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (id !== requestRef.current) { stream.getTracks().forEach((t) => t.stop()); return 'cancelled'; }
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      if (id !== requestRef.current) return 'cancelled';
      const track = stream.getVideoTracks()[0];
      const { deviceId, facingMode } = track.getSettings();
      sourceRef.current = deviceId ? { deviceId: { exact: deviceId } } : source;
      setMirrored(facingMode !== 'environment');
      track.onended = () => { stop(); setError('The camera disconnected. Start it again.'); };
      setStatus('live');
      const all = await navigator.mediaDevices.enumerateDevices();
      if (id !== requestRef.current) return 'cancelled';
      setDevices(all.filter((d) => d.kind === 'videoinput'));
      return 'ok';
    } catch (e) {
      if (id !== requestRef.current) return 'cancelled';
      release();
      sourceRef.current = DEFAULT;
      setStatus('idle');
      setError(explain(e));
      return 'failed';
    }
  }, [release, stop]);

  const switchCamera = async () => {
    const current = streamRef.current?.getVideoTracks()[0]?.getSettings();
    if (!current) return;
    const previous = sourceRef.current;
    const attempts: MediaTrackConstraints[] = [];
    if (current.facingMode) attempts.push({ facingMode: { exact: current.facingMode === 'user' ? 'environment' : 'user' } });
    if (devices.length > 1) {
      const next = (devices.findIndex((d) => d.deviceId === current.deviceId) + 1) % devices.length;
      attempts.push({ deviceId: { exact: devices[next].deviceId } });
    }
    for (const source of attempts) if ((await start(source)) !== 'failed') return;
    if ((await start(previous)) === 'ok') setError('Couldn’t switch cameras. Using the previous one.');
  };

  useEffect(() => {
    window.addEventListener('pagehide', stop);
    return () => { window.removeEventListener('pagehide', stop); requestRef.current++; release(); };
  }, [stop, release]);

  return { videoRef, status, error, setError, mirrored, canSwitch: status === 'live' && devices.length > 1, start, stop, switchCamera };
}
