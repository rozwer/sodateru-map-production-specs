import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { distanceAndBearing, useCompassLocation, useVoiceRecorder } from './device';
import { useBrowserSpeech } from './browser-speech';

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
    await act(async () => { voice.stop(); Recorder.instances[0]!.finish(); });
    expect(voice.state).toBe('transcribing');
    await act(async () => voice.cancel());
    await act(async () => finish('古い音声の本文'));
    expect(received).not.toHaveBeenCalled();
    expect(voice.state).toBe('idle');
    expect(tracks[0]!.stop).toHaveBeenCalled();
  });

  it('does not let a cancelled recorder stop a new recording', async () => {
    const transcribe = vi.fn(async () => '本文');
    let voice!: ReturnType<typeof useVoiceRecorder>;
    function Test() { voice = useVoiceRecorder(transcribe, vi.fn()); return null; }
    await act(async () => root.render(<Test/>));
    await act(async () => voice.start());
    await act(async () => voice.cancel());
    await act(async () => voice.start());
    await act(async () => Recorder.instances[0]!.finish());
    expect(voice.state).toBe('recording');
    expect(tracks[1]!.stop).not.toHaveBeenCalled();
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

  it('removes orientation listeners even when geolocation is unavailable', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: vi.fn(async () => 'granted') });
    const remove = vi.spyOn(window, 'removeEventListener');
    let compass!: ReturnType<typeof useCompassLocation>;
    function Test() { compass = useCompassLocation(); return null; }
    await act(async () => root.render(<Test/>));
    await act(async () => compass.enableHeading());
    await act(async () => root.unmount());
    expect(remove).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
    remove.mockRestore();
    root = createRoot(host);
  });

  it('releases GPS while a cached screen is hidden and restarts when shown', async () => {
    const clearWatch = vi.fn(), watchPosition = vi.fn(() => 14);
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition, clearWatch } });
    function Test({ enabled }: { enabled: boolean }) { useCompassLocation(enabled); return null; }
    await act(async () => root.render(<Test enabled/>));
    await act(async () => root.render(<Test enabled={false}/>));
    expect(clearWatch).toHaveBeenCalledWith(14);
    await act(async () => root.render(<Test enabled/>));
    expect(watchPosition).toHaveBeenCalledTimes(2);
  });

  it('runs browser recognition during recording and exposes only the final stopped text', async () => {
    let recognition!: { onresult: (event: unknown) => void; onend: () => void; stop: ReturnType<typeof vi.fn> };
    vi.stubGlobal('SpeechRecognition', class {
      lang = ''; continuous = false; interimResults = false;
      onresult = () => {}; onerror = () => {}; onend = () => {};
      stop = vi.fn(); abort = vi.fn(); start = vi.fn();
      constructor() { recognition = this; }
    });
    const received = vi.fn();
    let voice!: ReturnType<typeof useBrowserSpeech>;
    function Test() { voice = useBrowserSpeech(received); return null; }
    await act(async () => root.render(<Test/>));
    await act(async () => voice.start());
    recognition.onresult({ results: [[{ transcript: '途中の文章' }]] });
    expect(received).not.toHaveBeenCalled();
    await act(async () => { voice.stop(); Recorder.instances[0]!.finish(); });
    expect(recognition.stop).toHaveBeenCalled();
    await act(async () => { recognition.onresult({ results: [[{ transcript: '本人が確認する最終文章' }]] }); recognition.onend(); });
    expect(received).toHaveBeenCalledExactlyOnceWith('本人が確認する最終文章');
    expect(voice.state).toBe('stopped');
  });

  it('aborts browser recognition when microphone recording is refused', async () => {
    const abort = vi.fn();
    vi.stubGlobal('SpeechRecognition', class { lang = ''; continuous = false; interimResults = false; onresult = null; onerror = null; onend = null; start() {} stop() {} abort = abort; });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(async () => { throw new DOMException('Denied', 'NotAllowedError'); }) } });
    const received = vi.fn();
    let voice!: ReturnType<typeof useBrowserSpeech>;
    function Test() { voice = useBrowserSpeech(received); return null; }
    await act(async () => root.render(<Test/>));
    await act(async () => voice.start());
    expect(abort).toHaveBeenCalled();
    expect(received).not.toHaveBeenCalled();
    expect(voice.state).toBe('error');
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
