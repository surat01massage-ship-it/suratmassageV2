// Sound alert utility for SabaiDee Massage
// Engineered specifically for Mobile Phones (iOS Safari, Android Chrome, PWAs, WebViews)
// Features: Pre-unlocked HTML5 Audio Loop, High-Harmonic Loud Buzzer WAV, Web Audio Siren,
// Mobile Haptic Vibration, Speech Synthesis Voice, and Media Keep-Alive.

let audioCtx: AudioContext | null = null;
let htmlAudioFallback: HTMLAudioElement | null = null;
let keepAliveAudio: HTMLAudioElement | null = null;
let ringtoneInterval: any = null;
let vibrationInterval: any = null;
let isAudioSessionUnlocked = false;

// Initialize or get the global AudioContext
export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  return audioCtx!;
}

// Generate a Loud, Piercing 16-bit PCM WAV Ringtone (Grab / LINE MAN / Delivery buzzer style)
// High-frequency dual square-triangle harmonics cutting through noisy rooms & phone speakers
function generateLoudBuzzerWavUri(): string {
  const sampleRate = 22050;
  const duration = 1.6; // 1.6 seconds loop
  const totalSamples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(totalSamples);

  // Fast urgent Grab/Delivery style alert pattern:
  // 4 rapid piercing bursts followed by a distinctive high chime
  const beeps = [
    // Burst 1 (1200Hz + 2400Hz)
    { freq1: 1174.66, freq2: 2349.32, start: 0.00, dur: 0.14 },
    // Burst 2 (1480Hz + 2960Hz)
    { freq1: 1479.98, freq2: 2959.96, start: 0.17, dur: 0.14 },
    // Burst 3 (1174Hz + 2349Hz)
    { freq1: 1174.66, freq2: 2349.32, start: 0.34, dur: 0.14 },
    // Burst 4 (1760Hz + 3520Hz) - Highest piercing alert
    { freq1: 1760.00, freq2: 3520.00, start: 0.51, dur: 0.28 },

    // Short pause (0.2s)

    // Burst 5 (1174Hz + 2349Hz)
    { freq1: 1174.66, freq2: 2349.32, start: 0.88, dur: 0.14 },
    // Burst 6 (1480Hz + 2960Hz)
    { freq1: 1479.98, freq2: 2959.96, start: 1.05, dur: 0.14 },
    // Burst 7 (1760Hz + 3520Hz - ringing bell finish)
    { freq1: 1760.00, freq2: 2637.02, start: 1.22, dur: 0.35 }
  ];

  beeps.forEach(({ freq1, freq2, start, dur }) => {
    const startIdx = Math.floor(start * sampleRate);
    const endIdx = Math.min(totalSamples, Math.floor((start + dur) * sampleRate));
    const toneLength = endIdx - startIdx;

    for (let i = startIdx; i < endIdx; i++) {
      const t = (i - startIdx) / sampleRate;
      // Attack and release envelope to prevent clicking and maximize punch
      const progress = (i - startIdx) / toneLength;
      let env = 1.0;
      if (progress < 0.08) {
        env = progress / 0.08;
      } else {
        env = Math.exp(-progress * 2.8);
      }

      // Rich multi-harmonic mixture:
      // Sine (fundamental) + Square/Sign (odd harmonics for cutting power) + Octave overtone
      const sin1 = Math.sin(2 * Math.PI * freq1 * t);
      const sqr1 = Math.sign(sin1);
      const sin2 = Math.sin(2 * Math.PI * freq2 * t);

      // Blended waveform for maximum acoustic loudness on phone speakers
      const sample = (sin1 * 0.45 + sqr1 * 0.30 + sin2 * 0.25) * env * 0.95;
      buffer[i] += sample;
    }
  });

  // Build standard 16-bit PCM WAV container
  const wavBytes = new Uint8Array(44 + totalSamples * 2);
  const view = new DataView(wavBytes.buffer);

  // "RIFF" chunk
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + totalSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // "fmt " subchunk
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate (SampleRate * Channels * BitsPerSample/8)
  view.setUint16(32, 2, true); // Block align (Channels * BitsPerSample/8)
  view.setUint16(34, 16, true); // Bits per sample
  // "data" subchunk
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, totalSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  // Convert to Base64 data URI
  let binary = '';
  const len = wavBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(wavBytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Generate an ultra-short 0.1s silent WAV for keep-alive & unlocking
function generateSilentWavUri(): string {
  const sampleRate = 8000;
  const totalSamples = 800; // 0.1s
  const wavBytes = new Uint8Array(44 + totalSamples * 2);
  const view = new DataView(wavBytes.buffer);

  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + totalSamples * 2, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, totalSamples * 2, true);

  let binary = '';
  for (let i = 0; i < wavBytes.byteLength; i++) {
    binary += String.fromCharCode(wavBytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Prepare HTML5 Audio fallback element
function getFallbackAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!htmlAudioFallback) {
    try {
      const uri = generateLoudBuzzerWavUri();
      htmlAudioFallback = new Audio(uri);
      htmlAudioFallback.volume = 1.0;
      htmlAudioFallback.preload = 'auto';
    } catch (e) {
      console.warn("Could not generate HTML5 audio element", e);
    }
  }
  return htmlAudioFallback;
}

// Check if browser audio is currently allowed and active
export function isAudioRunning(): boolean {
  if (isAudioSessionUnlocked) return true;
  if (!audioCtx) return false;
  return audioCtx.state === 'running';
}

// Prime & unlock audio session on user touch/click gesture (100% SILENT)
export async function unlockAudioContext(): Promise<boolean> {
  if (isAudioSessionUnlocked && audioCtx?.state === 'running') {
    return true;
  }

  // 1. Quietly resume Web Audio API without playing any sound
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (err) {}

  // 2. Preload HTML5 Audio fallback element in memory (WITHOUT playing sound)
  try {
    getFallbackAudioElement();
  } catch (err) {}

  // 3. Request Notification permissions silently if available
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  isAudioSessionUnlocked = true;
  return true;
}

// Start continuous silent keep-alive loop when Staff is Online
// This prevents iOS Safari from putting the audio hardware to sleep and keeps timers active
export function startAudioKeepAlive(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!keepAliveAudio) {
      keepAliveAudio = new Audio(generateSilentWavUri());
      keepAliveAudio.loop = true;
      keepAliveAudio.volume = 0.01;
    }
    keepAliveAudio.play().catch(() => {});
  } catch (e) {}

  // Also keep screen awake via WakeLock if supported
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      (navigator as any).wakeLock.request('screen').catch(() => {});
    } catch (e) {}
  }
}

export function stopAudioKeepAlive(): void {
  if (keepAliveAudio) {
    try {
      keepAliveAudio.pause();
      keepAliveAudio.currentTime = 0;
    } catch (e) {}
  }
}

// Speak Thai voice alert using speech synthesis
function speakVoiceAlert(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.volume = 1.0;
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    // Pick Thai voice if available in system
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.lang.includes('th') || v.lang.includes('TH'));
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis note:", e);
  }
}

// Play Loud Siren Ringtone (Multi-layer: WebAudio + HTML5 Audio + Haptic Vibration + Voice)
export function playJobAlertSound(options?: { soundEnabled?: boolean; title?: string; message?: string }): void {
  const isEnabled = options?.soundEnabled !== false;
  if (!isEnabled) return;

  // 1. Mobile Phone Haptic Vibration (Aggressive pulses)
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([600, 200, 600, 200, 800, 200, 1000]);
    } catch (e) {}
  }

  // 2. Native System Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(options?.title || "🚨 มีงานนวดใหม่เรียกตัวด่วน!", {
        body: options?.message || "มีลูกค้าเรียกงานนวดเข้ามาหาคุณ กรุณากดรับงานภายใน 30 วินาที",
        icon: "/favicon.ico",
        requireInteraction: true
      });
    } catch (e) {}
  }

  // 3. Layer A: HTML5 Audio Direct Play (Works reliably on mobile when unlocked)
  try {
    const audio = getFallbackAudioElement();
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 1.0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("HTML5 audio play rejected:", err);
        });
      }
    }
  } catch (e) {
    console.warn("HTML5 audio playback error:", e);
  }

  // 4. Layer B: Web Audio Multi-Oscillator Loud Siren (Synthesizes live on speakers)
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const playSynthesizer = () => {
        const now = ctx.currentTime;

        // Master Gain at max volume
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(1.0, now);
        masterGain.connect(ctx.destination);

        // Piercing ascending 4-tone siren
        const notes = [
          { f: 1174.66, t: 0.00, d: 0.14, type: 'sawtooth' as OscillatorType, vol: 0.8 },
          { f: 1479.98, t: 0.17, d: 0.14, type: 'sawtooth' as OscillatorType, vol: 0.85 },
          { f: 1174.66, t: 0.34, d: 0.14, type: 'sawtooth' as OscillatorType, vol: 0.8 },
          { f: 1760.00, t: 0.51, d: 0.30, type: 'square' as OscillatorType, vol: 0.9 },
          { f: 1174.66, t: 0.88, d: 0.14, type: 'sawtooth' as OscillatorType, vol: 0.8 },
          { f: 1479.98, t: 1.05, d: 0.14, type: 'sawtooth' as OscillatorType, vol: 0.85 },
          { f: 1760.00, t: 1.22, d: 0.35, type: 'square' as OscillatorType, vol: 0.95 }
        ];

        notes.forEach(({ f, t, d, type, vol }) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(f, now + t);

          g.gain.setValueAtTime(0.001, now + t);
          g.gain.exponentialRampToValueAtTime(vol, now + t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + t + d);

          osc.connect(g);
          g.connect(masterGain);

          osc.start(now + t);
          osc.stop(now + t + d);
        });
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(playSynthesizer).catch(() => {});
      } else {
        playSynthesizer();
      }
    }
  } catch (e) {}

  // 5. Layer C: Thai Voice Announcement (Speaks out loud on phone)
  speakVoiceAlert("มีงานนวดใหม่เรียกตัวด่วน กรุณากดรับงานค่ะ");
}

// Start repeating ringtone alert every 2.0s while incoming booking is waiting
export function startJobAlertRingtone(options?: { soundEnabled?: boolean; title?: string; message?: string }): void {
  stopJobAlertRingtone(); // Clear any existing ringtone

  // 1. Set HTML5 Audio to native loop for zero-latency continuous playback
  try {
    const audio = getFallbackAudioElement();
    if (audio) {
      audio.loop = true;
      audio.currentTime = 0;
      audio.volume = 1.0;
      audio.play().catch(() => {});
    }
  } catch (e) {}

  // 2. Play initial multi-layer alert
  playJobAlertSound(options);

  // 3. Repeat synthesizer & speech every 2.4 seconds as fallback
  ringtoneInterval = setInterval(() => {
    playJobAlertSound(options);
  }, 2400);

  // 4. Repeat haptic vibration on phone every 2 seconds
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    vibrationInterval = setInterval(() => {
      try {
        navigator.vibrate([600, 200, 600, 200, 800, 200, 1000]);
      } catch (e) {}
    }, 2200);
  }
}

// Stop repeating ringtone (called when accepted, rejected, or cancelled)
export function stopJobAlertRingtone(): void {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  const audio = getFallbackAudioElement();
  if (audio) {
    try {
      audio.loop = false;
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  }
}

// Online activation confirmation sound (kept quiet to avoid unwanted noise on clicks)
export function playOnlineActiveSound(): void {
  // Silent by default as requested: sound should only be emitted when a job arrives
}

// Gentle customer chime
export function playCustomerChime(): void {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const play = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(play).catch(() => {});
      } else {
        play();
      }
    }
  } catch (e) {}
}

// One-time silent background unlock on first user gesture (completely inaudible)
if (typeof window !== 'undefined') {
  const silentUnlock = () => {
    unlockAudioContext();
  };
  window.addEventListener('click', silentUnlock, { once: true, passive: true });
  window.addEventListener('touchstart', silentUnlock, { once: true, passive: true });
}
