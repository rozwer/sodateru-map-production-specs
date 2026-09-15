import { useCallback, useEffect, useRef, useState } from 'react';
import { explorationMessages as m } from './messages';
import type { Coordinates, PositionReading, RecordingState } from './view-types';

export function distanceAndBearing(from: Coordinates, to: Coordinates) {
  const radians = Math.PI / 180;
  const lat1 = from[1] * radians;
  const lat2 = to[1] * radians;
  const dLat = lat2 - lat1;
  const dLon = (to[0] - from[0]) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const distanceM = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return { distanceM, bearing: (Math.atan2(y, x) / radians + 360) % 360 };
}

type OrientationPermissionEvent = typeof DeviceOrientationEvent & { requestPermission?: (absolute?: boolean) => Promise<'granted' | 'denied'> };
type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };

export function useCompassLocation() {
  const [position, setPosition] = useState<PositionReading | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [headingState, setHeadingState] = useState<'idle' | 'live' | 'denied' | 'unavailable'>('idle');
  const [now, setNow] = useState(Date.now());
  const active = useRef(true);
  const removeOrientation = useRef<(() => void) | null>(null);

  useEffect(() => {
    active.current = true;
    if (!navigator.geolocation) { setPositionError(m.positionUnavailable); return; }
    const watch = navigator.geolocation.watchPosition(reading => {
      if (!active.current) return;
      setPosition({ coordinates: [reading.coords.longitude, reading.coords.latitude], accuracy: reading.coords.accuracy, timestamp: reading.timestamp });
      setPositionError(null);
    }, error => {
      if (active.current) setPositionError(error.code === 1 ? m.positionDenied : m.positionUnavailable);
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active.current = false;
      navigator.geolocation.clearWatch(watch);
      window.clearInterval(timer);
      removeOrientation.current?.();
    };
  }, []);

  const enableHeading = useCallback(async () => {
    const event = window.DeviceOrientationEvent as OrientationPermissionEvent | undefined;
    if (!event) { setHeadingState('unavailable'); return; }
    try {
      if (event.requestPermission && await event.requestPermission(true) !== 'granted') {
        if (active.current) setHeadingState('denied');
        return;
      }
      if (!active.current) return;
      removeOrientation.current?.();
      let received = false;
      const listener = (raw: DeviceOrientationEvent) => {
        const e = raw as CompassEvent;
        const absolute = e.webkitCompassHeading !== undefined ? e.webkitCompassHeading : e.absolute && e.alpha !== null ? 360 - e.alpha : null;
        if (absolute === null || !Number.isFinite(absolute) || (e.webkitCompassAccuracy !== undefined && e.webkitCompassAccuracy < 0)) return;
        received = true;
        const screenAngle = window.screen.orientation?.angle ?? 0;
        setHeading((absolute + screenAngle + 360) % 360);
        setHeadingState('live');
      };
      window.addEventListener('deviceorientationabsolute', listener as EventListener);
      window.addEventListener('deviceorientation', listener);
      const timeout = window.setTimeout(() => { if (!received && active.current) setHeadingState('unavailable'); }, 4000);
      removeOrientation.current = () => {
        window.removeEventListener('deviceorientationabsolute', listener as EventListener);
        window.removeEventListener('deviceorientation', listener);
        window.clearTimeout(timeout);
      };
    } catch {
      if (active.current) setHeadingState('denied');
    }
  }, []);

  return { position, positionError, stale: position !== null && (positionError !== null || now - position.timestamp > 15_000), heading, headingState, enableHeading };
}

/** Recording is local. Only the explicit stop action provides the blob to the configured transcriber. */
export function useVoiceRecorder(transcribe: (audio: Blob, signal: AbortSignal) => Promise<string>, onTranscript: (text: string) => void) {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(40).fill(0));
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const generation = useRef(0);
  const frames = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const request = useRef<AbortController | null>(null);
  const lastAudio = useRef<Blob | null>(null);

  const release = useCallback(() => {
    if (frames.current !== null) cancelAnimationFrame(frames.current);
    if (timer.current !== null) clearInterval(timer.current);
    frames.current = null;
    timer.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    void audioContext.current?.close();
    audioContext.current = null;
  }, []);

  useEffect(() => () => {
    generation.current += 1;
    request.current?.abort();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    release();
    lastAudio.current = null;
  }, [release]);

  const convert = useCallback(async (blob: Blob, attempt: number) => {
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setState('transcribing');
    try {
      const text = await transcribe(blob, controller.signal);
      if (generation.current !== attempt || controller.signal.aborted) return;
      onTranscript(text);
      setState('stopped');
      setError(null);
    } catch (failure) {
      if (generation.current !== attempt || controller.signal.aborted) return;
      setState('error');
      setError(failure instanceof Error ? failure.message : m.transcriptionFailed);
    }
  }, [onTranscript, transcribe]);

  const start = useCallback(async () => {
    if (recorder.current?.state === 'recording') return;
    const attempt = ++generation.current;
    request.current?.abort();
    setState('requesting');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error(m.microphoneUnavailable);
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (attempt !== generation.current) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream.current = acquired;
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(value => MediaRecorder.isTypeSupported(value));
      const recording = new MediaRecorder(acquired, type ? { mimeType: type } : undefined);
      recorder.current = recording;
      const chunks: Blob[] = [];
      recording.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recording.onstop = () => {
        if (attempt !== generation.current) return;
        release();
        const blob = new Blob(chunks, { type: recording.mimeType });
        lastAudio.current = blob;
        void convert(blob, attempt);
      };
      recording.onerror = () => {
        if (attempt !== generation.current) return;
        generation.current += 1;
        release();
        setState('error');
        setError(m.microphoneUnavailable);
      };
      setSeconds(0);
      setLevels(Array(40).fill(0));
      recording.start();
      setState('recording');
      const started = performance.now();
      timer.current = window.setInterval(() => setSeconds(Math.floor((performance.now() - started) / 1000)), 250);
      const context = new AudioContext();
      audioContext.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(acquired).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let previous = 0;
      const sample = (at: number) => {
        if (at - previous > 80) {
          analyser.getByteTimeDomainData(data);
          const rms = Math.sqrt(data.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / data.length);
          setLevels(values => [...values.slice(1), Math.min(1, rms * 5)]);
          previous = at;
        }
        frames.current = requestAnimationFrame(sample);
      };
      frames.current = requestAnimationFrame(sample);
    } catch (failure) {
      if (attempt !== generation.current) return;
      generation.current += 1;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      release();
      setState('error');
      setError(failure instanceof DOMException && failure.name === 'NotAllowedError' ? m.microphoneDenied : m.microphoneUnavailable);
    }
  }, [convert, release]);

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }, []);
  const retry = useCallback(() => {
    if (lastAudio.current) void convert(lastAudio.current, generation.current);
    else void start();
  }, [convert, start]);
  const cancel = useCallback(() => {
    generation.current += 1;
    request.current?.abort();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    release();
    lastAudio.current = null;
    setState('idle');
  }, [release]);
  return { state, seconds, levels, error, start, stop, retry, cancel };
}
