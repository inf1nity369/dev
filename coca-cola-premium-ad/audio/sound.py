"""Score + sound design, fully synthesized (no samples). Bright, happy, 120 BPM in G major.

Bars are 2 s (0.5 s beats). Progression: G | D | Em | C | G | D | C | D | G
Picture cues (src/timeline.js):
  1.0 ribbon wipe   3.0 zoom push   5.0 bubble iris   5.5 tab click   6.0 PHSST (on C, the lift)
  8.0 light burst -> full groove    12.0 ribbon wipe  12.5 landing    15.0 logo   16.0 "Taste the Feeling." (home on G)

    python3 audio/sound.py out/soundtrack.wav
"""
import sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 18.0
N = int(SR * DUR)
BEAT = 0.5
BAR = 2.0
rng = np.random.default_rng(2016)

mix = np.zeros((N, 2))
verb = np.zeros((N, 2))


def at(t):
    return int(round(t * SR))


def place(t0, sig, gain=1.0, pan=0.0, send=0.0):
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)
    i0 = at(t0)
    if i0 >= N:
        return
    if i0 < 0:
        sig, i0 = sig[-i0:], 0
    n = min(len(sig), N - i0)
    mix[i0:i0 + n] += sig[:n] * gain
    if send:
        verb[i0:i0 + n] += sig[:n] * gain * send


def filt(x, kind, f, order=4):
    wn = [f[0] / (SR / 2), f[1] / (SR / 2)] if kind == 'band' else f / (SR / 2)
    return signal.sosfilt(signal.butter(order, wn, btype='bandpass' if kind == 'band' else kind, output='sos'), x, axis=0)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def noise(n):
    return rng.standard_normal(n)


NOTES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def hz(name):
    p, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTES[p] + 12 * (o + 1) - 69) / 12)


def sweep_noise(dur, f_path, q=0.4):
    n = int(dur * SR)
    f, ts, Z = signal.stft(noise(n), SR, nperseg=1024)
    for k in range(Z.shape[1]):
        fc = f_path(min(1.0, ts[k] / dur))
        Z[:, k] *= np.exp(-0.5 * (np.log2(np.maximum(f, 20) / fc) / q) ** 2)
    _, y = signal.istft(Z, SR, nperseg=1024)
    y = y[:n]
    return y / (np.max(np.abs(y)) + 1e-9)


# ------------------------------------------------------------------ instruments
def marimba(f, length=0.9):
    x = tt(length)
    s = (np.sin(2 * np.pi * f * x) * np.exp(-x / 0.42)
         + 0.32 * np.sin(2 * np.pi * f * 3.93 * x) * np.exp(-x / 0.07)
         + 0.08 * np.sin(2 * np.pi * f * 9.2 * x) * np.exp(-x / 0.015))
    return s * np.minimum(1, x / 0.003)


def bell(f, length=2.2, bright=1.0):
    x = tt(length)
    parts = [(1, 1.0, 1.4), (2.0, 0.35, 0.8), (2.76, 0.3 * bright, 0.55), (5.4, 0.12 * bright, 0.3), (8.93, 0.05 * bright, 0.15)]
    return sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / d) for r, a, d in parts) * np.minimum(1, x / 0.002)


def saw(f, n, cents=(-8, 0, 7), kmax_hz=5000):
    x = np.arange(n) / SR
    out = np.zeros(n)
    for c in cents:
        f0 = f * 2 ** (c / 1200); ph = rng.random() * 6.28
        for k in range(1, int(kmax_hz / f0) + 1):
            out += np.sin(2 * np.pi * f0 * k * x + ph * k) / k
    return out / len(cents)


def pad(notes, dur, cutoff=1400):
    n = int(dur * SR)
    x = sum(saw(hz(nm), n) for nm in notes) / len(notes)
    x = filt(x, 'low', cutoff, 2)
    env = np.minimum(1, np.arange(n) / (0.35 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.4 * SR))
    return x * env


def bass(f, length=0.42):
    x = tt(length)
    s = np.sin(2 * np.pi * f * x) + 0.25 * np.sin(4 * np.pi * f * x) * np.exp(-x / 0.08)
    return s * np.exp(-x / 0.3) * np.minimum(1, x / 0.004) * np.minimum(1, (length - x) / 0.03)


def kick(length=0.32):
    x = tt(length)
    f = 52 + 90 * np.exp(-x / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.12) + filt(noise(len(x)), 'high', 3000) * np.exp(-x / 0.003) * 0.15


def clap():
    x = tt(0.3)
    env = sum(np.exp(-np.clip(x - d, 0, None) / 0.005) * (x >= d) for d in (0.0, 0.009, 0.018)) + 0.4 * np.exp(-x / 0.09)
    return filt(noise(len(x)), 'band', (1000, 6000)) * env * 0.6


def shaker(acc=1.0):
    x = tt(0.07)
    return filt(noise(len(x)), 'band', (5000, 12000)) * np.exp(-x / 0.018) * np.minimum(1, x / 0.004) * acc


def cymbal(length=2.0):
    x = tt(length)
    return filt(noise(len(x)), 'high', 6000) * np.exp(-x / 0.6) * np.minimum(1, x / 0.01)


def sparkle(t0, dur, count, lo='G6', hi='D8', gain=0.05, pan=0.0):
    pent = [n + str(o) for o in range(5, 9) for n in ('G', 'A', 'B', 'D', 'E')]
    pool = [p for p in pent if hz(lo) <= hz(p) <= hz(hi)]
    for i in range(count):
        place(t0 + dur * i / count + rng.uniform(0, dur / count), bell(hz(pool[rng.integers(len(pool))]), 0.8, 0.6),
              gain * rng.uniform(0.5, 1.0), pan=np.clip(pan + rng.uniform(-0.5, 0.5), -1, 1), send=0.6)


# ------------------------------------------------------------------ harmony
CHORDS = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'G']
VOICING = {'G': ['G3', 'B3', 'D4', 'G4'], 'D': ['F#3', 'A3', 'D4', 'F#4'], 'Em': ['G3', 'B3', 'E4', 'G4'], 'C': ['G3', 'C4', 'E4', 'G4']}
ROOT = {'G': 'G2', 'D': 'D2', 'Em': 'E2', 'C': 'C2'}

for b, ch in enumerate(CHORDS):
    t0 = b * BAR
    dur = BAR + 0.4 if b < 8 else 2.0
    place(t0, pad(VOICING[ch], dur), 0.07 if b == 0 else 0.055, send=0.4)

# ------------------------------------------------------------------ melody (marimba, doubled by bells after the drop)
MEL = [
    [('B4', 0, .5), ('D5', .5, .5), ('G5', 1, 1), ('F#5', 2, .5), ('E5', 2.5, .5), ('D5', 3, 1)],
    [('A4', 0, .5), ('D5', .5, .5), ('F#5', 1, 1), ('E5', 2, .5), ('D5', 2.5, .5), ('A4', 3, 1)],
    [('B4', 0, .5), ('E5', .5, .5), ('G5', 1, 1), ('F#5', 2, .5), ('G5', 2.5, .5), ('B5', 3, 1)],
    [('A5', 0, 1), ('G5', 1, .5), ('E5', 1.5, .5), ('C5', 2, 1), ('D5', 3, 1)],
    [('B4', 0, .5), ('D5', .5, .5), ('G5', 1, 1), ('F#5', 2, .5), ('E5', 2.5, .5), ('D5', 3, 1)],
    [('A4', 0, .5), ('D5', .5, .5), ('F#5', 1, 1), ('E5', 2, .5), ('D5', 2.5, .5), ('A4', 3, 1)],
    [('E5', 0, .5), ('G5', .5, .5), ('C6', 1, 1), ('B5', 2, .5), ('A5', 2.5, .5), ('G5', 3, 1)],
    [('F#5', 0, 1), ('A5', 1, 1), ('D6', 2, .5), ('C6', 2.5, .5), ('A5', 3, 1)],
]
for b, bar in enumerate(MEL):
    for (nm, beat, _) in bar:
        t0 = b * BAR + beat * BEAT
        g = 0.16 if b == 0 else 0.2
        place(t0, marimba(hz(nm)), g, pan=-0.12, send=0.3)
        if b >= 4:  # bells an octave up after the drop
            f = hz(nm) * 2
            place(t0, bell(f, 1.4), 0.035, pan=0.25, send=0.5)
# final note on the slogan
place(16.0, marimba(hz('G5'), 1.6), 0.22, send=0.4)
place(16.0, bell(hz('G6'), 2.0), 0.06, send=0.6)
for i, nm in enumerate(['G4', 'B4', 'D5', 'G5']):
    place(16.0 + i * 0.03, bell(hz(nm), 2.0, 0.5), 0.04, pan=-0.3 + i * 0.2, send=0.6)

# ------------------------------------------------------------------ groove
def in_gap(t):
    # breathing room: before the PHSST and while the can falls
    return (5.0 <= t < 6.0) or (12.0 <= t < 12.5) or t >= 16.0


for b in range(1, 8):
    t0 = b * BAR
    full = b >= 4
    for k in range(4):  # beats
        tb = t0 + k * BEAT
        if in_gap(tb):
            continue
        if full or k in (0, 2):
            place(tb, kick(), 0.42 if full else 0.32)
        if k in (1, 3):
            place(tb, clap(), 0.16 if full else 0.11, send=0.25)
    for k in range(16):  # shaker 16ths
        ts = t0 + k * BEAT / 4
        if in_gap(ts):
            continue
        place(ts, shaker(1.0 if k % 4 == 2 else 0.55), 0.05 if full else 0.035, pan=0.35)
    # bass: root / root / octave / fifth on 8ths
    root = hz(ROOT[CHORDS[b]])
    pattern = [1, 0, 1, 2, 1, 0, 1.5, 2] if full else [1, 0, 0, 0, 1, 0, 0, 0]
    for k, m in enumerate(pattern):
        tb = t0 + k * BEAT / 2
        if m == 0 or in_gap(tb):
            continue
        place(tb, bass(root * m), 0.22)

# ------------------------------------------------------------------ transitions & SFX
def whoosh(t0, dur, f0, f1, gain, pan_from=-0.8, pan_to=0.8, send=0.25):
    n = int(dur * SR)
    w = sweep_noise(dur, lambda u: f0 * (f1 / f0) ** u, q=0.5) * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    pans = np.linspace(pan_from, pan_to, n)
    place(t0, np.stack([w * np.cos((pans + 1) * np.pi / 4), w * np.sin((pans + 1) * np.pi / 4)], 1), gain, send=send)


# 1.0 ribbon wipe: airy swoosh + glitter
whoosh(0.7, 0.6, 500, 4000, 0.16)
sparkle(0.95, 0.4, 7, gain=0.04, pan=0.4)
# 3.0 zoom push
whoosh(2.72, 0.5, 300, 6000, 0.16, 0.0, 0.0)
place(3.0, cymbal(0.8), 0.03, send=0.3)
# 5.0 bubble iris: bloops rising
for i, (d, f) in enumerate([(0.0, 300), (0.07, 420), (0.15, 560), (0.24, 760)]):
    x = tt(0.14)
    bl = np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * x / x[-1])) / SR) * np.sin(np.pi * x / x[-1]) ** 2
    place(4.75 + d, bl, 0.07, pan=-0.3 + i * 0.2, send=0.4)
whoosh(4.72, 0.56, 800, 2500, 0.08, 0.3, -0.3)

# 5.5 tab click (clean, small)
x = tt(0.15)
click = filt(noise(len(x)), 'high', 3000) * np.exp(-x / 0.002) + 0.4 * np.sin(2 * np.pi * 2600 * x) * np.exp(-x / 0.02)
place(5.5, click, 0.22, send=0.15)
place(5.62, click * 0.6, 0.14, send=0.15)
# 6.0 PHSST + fizz (crisp, refreshing)
x = tt(1.2)
hiss = filt(noise(len(x)), 'band', (1800, 9500)) * np.minimum(1, x / 0.004) * (0.7 * np.exp(-x / 0.08) + 0.3 * np.exp(-x / 0.35))
hiss2 = filt(noise(len(x)), 'band', (1800, 9500)) * np.minimum(1, x / 0.004) * (0.7 * np.exp(-x / 0.08) + 0.3 * np.exp(-x / 0.35))
place(6.0, np.stack([hiss, hiss2], 1), 0.3, send=0.2)
x = tt(3.0); n = len(x)
rate = 900 * np.exp(-x / 0.7) + 120
fz = np.stack([filt((rng.random(n) < rate / SR) * rng.uniform(0.2, 1, n), 'high', 4500) for _ in range(2)], 1)
fz *= np.clip((3.0 - x) / 1.0, 0, 1)[:, None]
place(6.02, fz, 0.22, send=0.25)
sparkle(6.05, 0.6, 6, gain=0.035)

# 8.0 light burst: soft riser into a shimmer + cymbal
x = tt(0.6)
riser = filt(noise(len(x)), 'band', (2000, 10000)) * (x / x[-1]) ** 3
place(7.4, riser, 0.08, send=0.4)
sparkle(7.55, 0.45, 9, lo='D6', hi='G7', gain=0.03)
place(8.0, cymbal(2.2), 0.06, send=0.4)
whoosh(7.78, 0.5, 400, 3500, 0.1, 0.0, 0.0)
# swirl: liquid sweep, tuned ice clinks
whoosh(8.05, 1.5, 300, 1800, 0.1, -0.9, 0.9, send=0.35)
for t0, nm in [(8.7, 'D6'), (9.25, 'G6'), (9.9, 'B6'), (10.55, 'D7'), (11.05, 'G6')]:
    place(t0, bell(hz(nm), 0.9, 0.8), 0.05, pan=rng.uniform(-0.6, 0.6), send=0.5)

# 12.0 ribbon wipe + fall, 12.5 landing (soft thump, splash, glitter)
whoosh(11.72, 0.56, 600, 4500, 0.15, 0.8, -0.8)
sparkle(11.95, 0.35, 6, gain=0.035, pan=-0.4)
x = tt(0.45)
place(12.12, sweep_noise(0.38, lambda u: 2500 - 1800 * u, q=0.5) * np.linspace(0.2, 1, at(0.38)) ** 2, 0.08)
place(12.5, kick(0.5), 0.5)
x = tt(0.6)
splash = filt(noise(len(x)), 'band', (900, 7000)) * np.minimum(1, x / 0.006) * np.exp(-x / 0.14)
place(12.5, np.stack([splash, filt(noise(len(x)), 'band', (900, 7000)) * np.minimum(1, x / 0.006) * np.exp(-x / 0.14)], 1), 0.12, send=0.3)
sparkle(12.52, 0.5, 8, gain=0.03)

# 15.0 logo: glock arpeggio up; 16.5 shine glitter
for i, nm in enumerate(['G5', 'B5', 'D6', 'G6']):
    place(15.0 + i * 0.09, bell(hz(nm), 1.8), 0.05, pan=-0.4 + i * 0.25, send=0.6)
place(16.0, cymbal(2.0), 0.04, send=0.5)
sparkle(16.5, 0.8, 10, lo='D7', hi='D8', gain=0.025, pan=-0.3)

# ------------------------------------------------------------------ reverb + master
ir_n = at(1.8); x = np.arange(ir_n) / SR
ir = np.stack([noise(ir_n), noise(ir_n)], 1) * np.exp(-x / 0.4)[:, None]
ir = filt(ir, 'low', 8000, 2); ir[:at(0.015)] = 0
wet = np.stack([signal.fftconvolve(verb[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix += filt(wet, 'high', 200, 2) * 0.2

mix = filt(mix, 'high', 30, 2)
env = np.sqrt(signal.sosfilt(signal.butter(1, 8 / (SR / 2), output='sos'), mix[:, 0] ** 2 + mix[:, 1] ** 2) + 1e-9)
thr = np.percentile(env, 90)
mix *= np.where(env > thr, (thr / env) ** 0.3, 1.0)[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.2) / np.tanh(1.2) * 10 ** (-1.0 / 20)
fade = at(0.6)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5

out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav'
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out, 'peak', round(float(np.max(np.abs(mix))), 3), 'rms dB', round(float(20 * np.log10(np.sqrt(np.mean(mix ** 2)))), 1))
