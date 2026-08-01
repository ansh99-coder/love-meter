/**
 * Love Meter ❤️ — Audio asset generator.
 *
 * Generates lightweight WAV files into `public/assets/audio/`:
 *   - click.wav         (UI click)
 *   - success.wav       (success chime)
 *   - heartbeat.wav     (heart thump)
 *   - love-theme.wav    (soft looping ambient music for the music toggle)
 *
 * Pure Node.js, zero dependencies. Run with: npm run audio
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'audio');

fs.mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 22050;

/** Convert float samples [-1..1] into a 16-bit mono WAV buffer. */
function samplesToWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buffer;
}

/** Mix a tone into a sample buffer with an ADSR-ish envelope. */
function addTone(samples, start, duration, freq, { type = 'sine', amp = 0.5, decay = 0.15, phase = 0 } = {}) {
  const n = Math.floor(duration * SAMPLE_RATE);
  const startN = Math.floor(start * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    const idx = startN + i;
    if (idx >= samples.length) break;
    const t = i / SAMPLE_RATE;
    // simple exponential decay envelope
    const env = Math.exp(-decay * t) * amp;
    let v = 0;
    if (type === 'sine') v = Math.sin(2 * Math.PI * freq * t + phase);
    else if (type === 'triangle') v = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t + phase));
    else if (type === 'square') v = Math.sign(Math.sin(2 * Math.PI * freq * t + phase));
    samples[idx] += v * env;
  }
}

/** Write a generated buffer to disk. */
function write(name, samples) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, samplesToWav(samples));
  console.log(`  ✓ ${name}`);
}

// ---------------------------------------------------------------------------
// click.wav — short 1.2kHz tick, 90ms
// ---------------------------------------------------------------------------
{
  const dur = 0.09;
  const samples = new Float64Array(Math.floor(dur * SAMPLE_RATE));
  addTone(samples, 0, dur, 1200, { type: 'sine', amp: 0.5, decay: 40 });
  write('click.wav', samples);
}

// ---------------------------------------------------------------------------
// success.wav — ascending C-E-G arpeggio, ~0.6s
// ---------------------------------------------------------------------------
{
  const dur = 0.7;
  const samples = new Float64Array(Math.floor(dur * SAMPLE_RATE));
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((f, i) => addTone(samples, i * 0.14, 0.5, f, { type: 'sine', amp: 0.4, decay: 4 }));
  write('success.wav', samples);
}

// ---------------------------------------------------------------------------
// heartbeat.wav — low double-thump
// ---------------------------------------------------------------------------
{
  const dur = 0.5;
  const samples = new Float64Array(Math.floor(dur * SAMPLE_RATE));
  addTone(samples, 0, 0.14, 70, { type: 'sine', amp: 0.7, decay: 22 });
  addTone(samples, 0.18, 0.16, 65, { type: 'sine', amp: 0.6, decay: 20 });
  write('heartbeat.wav', samples);
}

// ---------------------------------------------------------------------------
// love-theme.wav — soft looping ambient arpeggio (C pentatonic, ~9.6s)
// ---------------------------------------------------------------------------
{
  const bar = 2.4; // seconds per chord
  const totalBars = 4;
  const dur = bar * totalBars;
  const samples = new Float64Array(Math.floor(dur * SAMPLE_RATE));

  // A gentle, dreamy progression: C - Am - F - G
  const chords = [
    [261.63, 329.63, 392.0, 523.25],   // C major
    [220.0, 261.63, 329.63, 440.0],    // A minor
    [174.61, 220.0, 261.63, 349.23],   // F major
    [196.0, 246.94, 293.66, 392.0]     // G major
  ];

  chords.forEach((chord, barIndex) => {
    const barStart = barIndex * bar;
    chord.forEach((freq, noteIndex) => {
      // Arpeggiate each chord note at a slight offset, softly.
      const t = barStart + noteIndex * 0.28;
      addTone(samples, t, 1.4, freq, { type: 'sine', amp: 0.18, decay: 2.2 });
    });
  });

  write('love-theme.wav', samples);
}

console.log('\nAudio assets generated in public/assets/audio/\n');

