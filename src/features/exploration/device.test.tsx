import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { distanceAndBearing, useCompassLocation, useVoiceRecorder } from './device';

class Recorder {
  static instances: Recorder[] = [];
  static isTypeSupported = () => true;
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { Recorder.instances.push(this); }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; }
  finish() { this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) }); this.onstop?.(); }
}

describe('exploration device lifecycle', () => {
  let root: Root;
  let host: HTMLDivElement;
  let tracks: { stop: ReturnType<typeof vi.fn> }[];
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    tracks = [];
    Recorder.instances = [];
    vi.stubGlobal('MediaRecorder', Recorder);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(async () => {
      const track = { stop: vi.fn() }; tracks.push(track); return { getTracks: () => [track] };
    }) } });
    vi.stubGlobal('AudioContext', class {
      createAnalyser() { return { fftSize: 256, frequencyBinCount: 128, getByteTimeDomainData: (data: Uint8Array) => data.fill(128) }; }
      createMediaStreamSource() { return { connect() {} }; }
      close() { return Promise.resolve(); }
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

  it('does not send a late transcript after cancellation', async () => {
    let finish!: (text: string) => void;
    const transcribe = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const received = vi.fn();
    let voice!: ReturnType<typeof useVoiceRecorder>;
    function Test() { voice = useVoiceRecorder(transcribe, received); return null; }
    await act(async () => root.render(<Test/>));
    await act(async () => voice.start());
    await act(async () => { voice.stop(); Recorder.instances[0].finish(); });
    expect(voice.state).toBe('transcribing');
    await act(async () => voice.cancel());
    await act(async () => finish('古い音声の本文'));
    expect(received).not.toHaveBeenCalled();
    expect(voice.state).toBe('idle');
    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it('does not let a cancelled recorder stop a new recording', async () => {
    const transcribe = vi.fn(async () => '本文');
    let voice!: ReturnType<typeof useVoiceRecorder>;
    function Test() { voice = useVoiceRecorder(transcribe, vi.fn()); return null; }
    await act(async () => root.render(<Test/>));
    await act(async () => voice.start());
    await act(async () => voice.cancel());
    await act(async () => voice.start());
    await act(async () => Recorder.instances[0].finish());
    expect(voice.state).toBe('recording');
    expect(tracks[1].stop).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('distinguishes orientation denial and stops position watching on unmount', async () => {
    const clearWatch = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      watchPosition: vi.fn(() => 12), clearWatch,
    } });
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: vi.fn(async () => 'denied') });
    let compass!: ReturnType<typeof useCompassLocation>;
    function Test() { compass = useCompassLocation(); return null; }
    await act(async () => root.render(<Test/>));
    await act(async () => compass.enableHeading());
    expect(compass.headingState).toBe('denied');
    expect(compass.heading).toBeNull();
    await act(async () => root.unmount());
    expect(clearWatch).toHaveBeenCalledWith(12);
    root = createRoot(host);
  });
});

it('uses measured coordinates for distance and bearing, including the date line', () => {
  const north = distanceAndBearing([136.965, 35.16892], [136.965, 35.17]);
  expect(north.distanceM).toBeCloseTo(120.09, 0);
  expect(north.bearing).toBe(0);
  const east = distanceAndBearing([179.999, 0], [-179.999, 0]);
  expect(east.distanceM).toBeCloseTo(222.39, 0);
  expect(east.bearing).toBeCloseTo(90, 4);
});
