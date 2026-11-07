"""ASMR sound design for the vertical cinematic cut (15 s), fully synthesized.

Close, crisp, realistic foreground sounds with a soft, warm felt-piano bed underneath:
  0.0 condensation plips          2.2 tab lift / click    2.5 PSST + fizz
  3.6 the pour (bubbly stream + the rising pitch of a filling glass)
  6.4 dive: muffled, underwater fizz + bubble plinks
  9.6 glass: surface fizz, drips letting go     13.45 black      14.25 sonic logo on the red disc

    python3 audio/sound_asmr.py out/soundtrack_asmr.wav
"""
import sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 15.0
N = int(SR * DUR)
rng = np.random.default_rng(1915)
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


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(n):
    return rng.standard_normal(n)


def hz(name):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    p, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[p] + 12 * (o + 1) - 69) / 12)


def bubble(f0, dur=0.03, rise=0.6):
    """Single bubble 'plink': a damped sine whose pitch rises as the bubble surfaces (Minnaert)."""
    x = tt(dur)
    f = f0 * (1 + rise * x / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / (dur * 0.3)) * np.minimum(1, x / 0.0008)


def bubble_cloud(dur, rate, f_lo, f_hi, dur_lo=0.008, dur_hi=0.04, rise=0.5, env=None, stereo=0.8):
    """Many bubbles: rate (per second) may be an array over time."""
    n = int(dur * SR)
    out = np.zeros((n + int(0.1 * SR), 2))
    t = 0.0
    while t < dur:
        r = rate(t / dur) if callable(rate) else rate
        t += rng.exponential(1.0 / max(r, 1e-3))
        if t >= dur:
            break
        f0 = np.exp(rng.uniform(np.log(f_lo), np.log(f_hi)))
        d = rng.uniform(dur_lo, dur_hi)
        b = bubble(f0, d, rise) * rng.uniform(0.2, 1.0) * (env(t / dur) if env else 1)
        pan = rng.uniform(-stereo, stereo)
        a = (pan + 1) * np.pi / 4
        i0 = int(t * SR)
        out[i0:i0 + len(b), 0] += b * np.cos(a)
        out[i0:i0 + len(b), 1] += b * np.sin(a)
    return out[:n]


def crackle(dur, rate, lo=3000, env=None):
    n = int(dur * SR)
    x = np.arange(n) / SR / dur
    r = rate(x) if callable(rate) else np.full(n, rate)
    out = np.stack([filt(signal.lfilter([1], [1, -0.55], (rng.random(n) < r / SR) * rng.uniform(0.15, 1, n)), 'high', lo) for _ in range(2)], 1)
    if env is not None:
        out *= env(x)[:, None]
    return out


def felt_piano(f, length=3.0, vel=1.0):
    x = tt(length)
    s = np.zeros_like(x)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        s += (1 / k ** 1.3) * np.sin(2 * np.pi * fk * x) * np.exp(-x * (0.9 + 0.55 * k))
    s += filt(noise(len(x)), 'low', 900) * np.exp(-x / 0.012) * 0.15
    s = filt(s, 'low', 2600, 2)
    return s * np.minimum(1, x / 0.006) * vel


def bell(f, length=2.0):
    x = tt(length)
    parts = [(1, 1.0, 1.3), (2.0, 0.3, 0.7), (2.76, 0.25, 0.5), (5.4, 0.08, 0.25)]
    return sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / d) for r, a, d in parts) * np.minimum(1, x / 0.002)


# ------------------------------------------------------------------ room tone (keeps it intimate, never silent)
room = filt(noise(N), 'band', (120, 3000), 2) * 0.004
place(0, np.stack([room, filt(noise(N), 'band', (120, 3000), 2) * 0.004], 1), 1.0)

# ------------------------------------------------------------------ warm felt-piano bed (quiet, D major)
bed = [(0.0, ['D3', 'A3', 'E4', 'F#4']), (3.0, ['B2', 'F#3', 'D4', 'A4']), (6.0, ['G2', 'D3', 'B3', 'F#4']),
       (9.0, ['A2', 'E3', 'C#4', 'E4']), (12.0, ['D3', 'A3', 'D4', 'F#4'])]
for t0, notes in bed:
    for i, nm in enumerate(notes):
        place(t0 + 0.04 * i, felt_piano(hz(nm), 3.4, 0.8), 0.05, pan=-0.3 + i * 0.2, send=0.6)
melody = [(0.75, 'F#5'), (1.5, 'A5'), (2.25, 'E5'), (3.75, 'D5'), (4.5, 'F#5'), (6.75, 'B4'), (7.5, 'D5'), (8.25, 'F#5'),
          (9.75, 'E5'), (10.5, 'C#5'), (11.25, 'A4'), (12.75, 'D5')]
for t0, nm in melody:
    place(t0, felt_piano(hz(nm), 2.4, 0.7), 0.035, pan=0.15, send=0.7)

# ------------------------------------------------------------------ 0.0 condensation: plips + cold micro-crackle
for t0 in (0.35, 0.9, 1.35, 1.8):
    place(t0, bubble(rng.uniform(1400, 2200), 0.05, 0.9), 0.06, pan=rng.uniform(-0.4, 0.4), send=0.2)
place(0.0, crackle(2.0, 35, 5000, env=lambda x: np.minimum(1, x * 3)), 0.05)

# ------------------------------------------------------------------ 2.2 tab lift, 2.5 PSST, fizz
x = tt(0.12)
click = filt(noise(len(x)), 'high', 2500) * np.exp(-x / 0.0018) + 0.35 * np.sin(2 * np.pi * 3100 * x) * np.exp(-x / 0.015)
place(2.2, click, 0.3, send=0.1)
x = tt(0.25)
creak = filt(noise(len(x)), 'band', (1500, 4500)) * np.exp(-x / 0.05) * (1 + 0.6 * np.sin(2 * np.pi * 60 * x))
place(2.24, creak, 0.05)
x = tt(0.06)
crack = filt(noise(len(x)), 'high', 1200) * np.exp(-x / 0.004)
place(2.49, crack, 0.45)
x = tt(1.1)
env = np.minimum(1, x / 0.003) * (0.75 * np.exp(-x / 0.07) + 0.25 * np.exp(-x / 0.4))
hissL = filt(noise(len(x)), 'band', (1600, 11000)) * env
hissR = filt(noise(len(x)), 'band', (1600, 11000)) * env
place(2.5, np.stack([hissL, hissR], 1), 0.42, send=0.12)
place(2.5, filt(noise(len(x)), 'band', (700, 1100), 2) * env * 0.4, 0.2)
place(2.55, crackle(1.1, lambda u: 2500 * np.exp(-u * 3) + 200, 3500, env=lambda u: 1 - u), 0.22)

# ------------------------------------------------------------------ 3.6 the pour
pd = 2.85
n = int(pd * SR); x = np.arange(n) / SR; u = x / pd
envp = np.minimum(1, x / 0.08) * np.clip((pd - x) / 0.25, 0, 1)
stream = np.stack([filt(noise(n), 'band', (180, 5000), 2), filt(noise(n), 'band', (180, 5000), 2)], 1)
mod = 0.6 + 0.4 * filt(np.abs(noise(n)), 'low', 18, 2) / 0.6
stream *= (envp * np.clip(mod, 0.2, 1.6))[:, None]
place(3.6, stream, 0.11)
# filling-glass resonance: narrow band rising in pitch
f_, ts, Z = signal.stft(noise(n), SR, nperseg=2048)
for k in range(Z.shape[1]):
    fc = 340 * (1100 / 340) ** min(1, ts[k] / pd)
    Z[:, k] *= np.exp(-0.5 * (np.log2(np.maximum(f_, 20) / fc) / 0.09) ** 2)
_, res = signal.istft(Z, SR, nperseg=2048)
res = res[:n] / (np.max(np.abs(res)) + 1e-9) * envp
place(3.6, res, 0.1, send=0.15)
place(3.6, bubble_cloud(pd, lambda v: 260 + 140 * np.sin(v * 9) ** 2, 250, 1600, 0.006, 0.03, 0.5, env=lambda v: min(1, v * 12) * min(1, (1 - v) * 8)), 0.17, send=0.1)
place(3.62, crackle(pd, 600, 4000, env=lambda v: np.minimum(1, v * 6) * np.clip((1 - v) * 5, 0, 1)), 0.08)

# ------------------------------------------------------------------ 6.4 dive into the drink
x = tt(0.6)
dive = filt(noise(len(x)), 'low', 900) * np.sin(np.pi * x / x[-1]) ** 2
place(6.15, dive, 0.12, send=0.3)
sub = filt(bubble_cloud(3.4, 45, 280, 2400, 0.015, 0.07, 0.8), 'low', 3500, 2)
place(6.35, sub, 0.22, send=0.35)
place(6.35, crackle(3.3, 300, 2500, env=lambda v: np.minimum(1, v * 8)), 0.06)
amb = filt(noise(at(3.3)), 'low', 300, 2) * 0.5
place(6.35, amb * np.minimum(1, np.arange(len(amb)) / at(0.3)), 0.05)

# ------------------------------------------------------------------ 9.6 the glass: surface fizz + drips letting go
x = tt(0.9)
place(9.62, bell(hz('E6'), 0.9) * 0.6, 0.025, send=0.4)
place(9.6, crackle(4.0, lambda v: 900 * np.exp(-v * 1.2) + 180, 3500, env=lambda v: np.minimum(1, v * 10) * np.clip((1 - v) * 3, 0, 1)), 0.16)
place(9.6, bubble_cloud(4.0, 70, 1500, 5000, 0.004, 0.015, 0.4, env=lambda v: max(0, 1 - v * 0.8)), 0.06)
for t0, f0 in ((10.44, 1500), (10.7, 1900), (10.94, 1700)):
    place(t0, bubble(f0, 0.07, 1.1), 0.08, pan=rng.uniform(-0.3, 0.3), send=0.25)

# ------------------------------------------------------------------ 12.0 hero, 13.45 black, 14.25 sonic logo
x = tt(0.7)
place(11.85, filt(noise(len(x)), 'band', (300, 2500)) * np.sin(np.pi * x / x[-1]) ** 2, 0.03, send=0.3)
for i, nm in enumerate(['D5', 'F#5', 'A5', 'D6']):
    place(14.25 + i * 0.11, bell(hz(nm), 1.6), 0.05, pan=-0.3 + i * 0.2, send=0.5)
for i, nm in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4']):
    place(14.25 + 0.02 * i, felt_piano(hz(nm), 1.8, 0.9), 0.06, send=0.6)

# ------------------------------------------------------------------ reverb + master
ir_n = at(2.0); x = np.arange(ir_n) / SR
ir = np.stack([noise(ir_n), noise(ir_n)], 1) * np.exp(-x / 0.5)[:, None]
ir = filt(ir, 'low', 6000, 2); ir[:at(0.02)] = 0
wet = np.stack([signal.fftconvolve(verb[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix += filt(wet, 'high', 150, 2) * 0.25
mix = filt(mix, 'high', 35, 2)
env = np.sqrt(signal.sosfilt(signal.butter(1, 10 / (SR / 2), output='sos'), mix[:, 0] ** 2 + mix[:, 1] ** 2) + 1e-9)
thr = np.percentile(env, 92)
mix *= np.where(env > thr, (thr / env) ** 0.35, 1.0)[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.15) / np.tanh(1.15) * 10 ** (-1.0 / 20)
fi, fo = at(0.05), at(0.5)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5

out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack_asmr.wav'
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out, 'peak', round(float(np.max(np.abs(mix))), 3), 'rms dB', round(float(20 * np.log10(np.sqrt(np.mean(mix ** 2)))), 1))
