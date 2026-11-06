"""Sound design + score for the spot, fully synthesized (no samples).

Locked to the picture cues in src/timeline.js (150 BPM grid, 0.4 s beats, 1.6 s bars):
  0.0  dark drone, frost shimmer          2.8  cut: soft hit, glide whoosh
  5.0  whip                               5.2  near-silence, tension
  6.0  tab click                          6.4  PHSST + fizz (Coca-Cola's sound ritual)
  7.6  riser                              8.0  DROP: groove, liquid swirl, ice clinks
 11.6  fall whoosh                       12.0  landing impact + splash
 14.4  lift                              15.2  logo sting, 16.35 glint, tail to 18.0

    python3 audio/sound.py out/soundtrack.wav
"""
import sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 18.0
N = int(SR * DUR)
BEAT = 0.4
BAR = 1.6
rng = np.random.default_rng(1886)
t_all = np.arange(N) / SR

mix = np.zeros((N, 2))
verb_send = np.zeros((N, 2))


def at(t):
    return int(round(t * SR))


def place(buf, t0, sig, gain=1.0, pan=0.0, send=0.0):
    """Add mono or stereo `sig` at time t0 with constant-power pan (-1..1)."""
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)
    i0 = at(t0)
    if i0 >= N:
        return
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    n = min(len(sig), N - i0)
    buf[i0:i0 + n] += sig[:n] * gain
    if send:
        verb_send[i0:i0 + n] += sig[:n] * gain * send


def sos(kind, f, order=4):
    if kind == 'band':
        return signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype='bandpass', output='sos')
    return signal.butter(order, f / (SR / 2), btype=kind, output='sos')


def filt(x, kind, f, order=4):
    return signal.sosfilt(sos(kind, f, order), x, axis=0)


def noise(n):
    return rng.standard_normal(n)


def expdec(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = max(1, min(na, n)); e[:na] = np.linspace(0, 1, na)
    nd = max(1, min(nd, n - na)); e[na:na + nd] = np.linspace(1, s, nd)
    if nr > 0:
        nr = min(nr, n); e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def sweep_noise(dur, f_path, q=0.35, seed=None):
    """Noise with a moving band-pass, done in the STFT domain. f_path(u) -> Hz for u in 0..1."""
    n = int(dur * SR)
    x = noise(n)
    f, tt, Z = signal.stft(x, SR, nperseg=1024)
    for k in range(Z.shape[1]):
        fc = f_path(min(1.0, tt[k] / dur))
        Z[:, k] *= np.exp(-0.5 * (np.log2(np.maximum(f, 20) / fc) / q) ** 2)
    _, y = signal.istft(Z, SR, nperseg=1024)
    y = y[:n]
    return y / (np.max(np.abs(y)) + 1e-9)


def saw(freq, n, detune_cents=(0,), cutoff=6000):
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for c in detune_cents:
        f0 = freq * 2 ** (c / 1200)
        ph = rng.random() * 2 * np.pi
        kmax = int(min(cutoff, SR / 2 - 1000) / f0)
        for k in range(1, kmax + 1):
            out += np.sin(2 * np.pi * f0 * k * tt + ph * k) / k * (1 - k / (kmax + 1)) ** 0.5
    return out / len(detune_cents)


def note(name):
    names = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    p, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[p] + 12 * (o + 1) - 69) / 12)


# ------------------------------------------------------------------ instruments
def kick(tune=48, length=0.6, punch=1.0):
    n = int(length * SR); tt = np.arange(n) / SR
    f = tune + 110 * np.exp(-tt / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-tt / 0.22)
    click = filt(noise(n), 'high', 2500) * np.exp(-tt / 0.004) * 0.35 * punch
    return np.tanh(1.6 * (body + click))


def clap():
    n = int(0.45 * SR); tt = np.arange(n) / SR
    env = np.zeros(n)
    for d in (0.0, 0.011, 0.022):
        env += np.exp(-np.clip(tt - d, 0, None) / 0.006) * (tt >= d)
    env += 0.5 * np.exp(-tt / 0.12)
    return filt(noise(n), 'band', (900, 5200)) * env * 0.8


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR); tt = np.arange(n) / SR
    x = filt(noise(n), 'high', 7000) * np.exp(-tt / (0.07 if open_ else 0.014))
    return x


def pluck(freq, length=0.5, bright=1.0):
    n = int(length * SR); tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(4 * np.pi * freq * tt) * np.exp(-tt / 0.05) * bright
         + 0.15 * np.sin(6 * np.pi * freq * tt) * np.exp(-tt / 0.03) * bright)
    return x * np.exp(-tt / 0.16) * np.minimum(1, tt / 0.002)


def bell(freq, length=3.5):
    n = int(length * SR); tt = np.arange(n) / SR
    parts = [(1, 1, 2.2), (2.0, 0.5, 1.4), (2.76, 0.35, 0.9), (5.4, 0.18, 0.5), (8.93, 0.08, 0.25)]
    x = sum(a * np.sin(2 * np.pi * freq * r * tt) * np.exp(-tt / d) for r, a, d in parts)
    return x * np.minimum(1, tt / 0.003)


def clink(f0):
    n = int(0.6 * SR); tt = np.arange(n) / SR
    parts = [(1, 1, 0.22), (2.32, 0.6, 0.14), (4.25, 0.4, 0.09), (6.63, 0.25, 0.05)]
    x = sum(a * np.sin(2 * np.pi * f0 * r * tt + rng.random() * 6) * np.exp(-tt / d) for r, a, d in parts)
    x += filt(noise(n), 'high', 4000) * np.exp(-tt / 0.003) * 0.6
    return x * 0.5


def pad(freqs, dur, attack=0.6, release=0.8, cutoff=1800):
    n = int(dur * SR)
    x = sum(saw(f, n, (-9, 0, 8), cutoff=cutoff * 2) for f in freqs) / len(freqs)
    x = filt(x, 'low', cutoff, 2)
    return x * adsr(n, attack, 0.3, 0.85, release)


def sub_note(freq, dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * tt) * adsr(n, 0.01, 0.1, 0.9, 0.08)


# ------------------------------------------------------------------ 0.0 – 8.0 : opening
# dark drone on D, filter slowly opening
n = at(8.1)
drone = 0.6 * np.sin(2 * np.pi * note('D2') * t_all[:n]) + 0.35 * np.sin(2 * np.pi * note('A2') * t_all[:n])
drone += 0.4 * filt(saw(note('D2'), n, (-6, 5), cutoff=2500), 'low', 600, 2)
drone *= np.minimum(1, t_all[:n] / 2.0) * (1 - 0.75 * np.clip((t_all[:n] - 5.2) / 0.3, 0, 1) * (t_all[:n] < 7.6))
drone *= np.where(t_all[:n] > 7.6, np.clip(1 - (t_all[:n] - 7.6) / 0.5, 0, 1) * 0.25 + 0.25, 1)
place(mix, 0, drone, 0.16, send=0.25)
# sub swell
place(mix, 0, np.sin(2 * np.pi * note('D1') * t_all[:at(5.3)]) * np.minimum(1, t_all[:at(5.3)] / 2.5) * np.clip((5.3 - t_all[:at(5.3)]) / 0.4, 0, 1), 0.22)

# frost shimmer: high glassy partials with slow tremolo
n = at(5.4)
sh = sum(np.sin(2 * np.pi * f * t_all[:n] + rng.random() * 6) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.7 + i * 0.31) * t_all[:n])) for i, f in enumerate([note('D6'), note('A6'), note('E7'), note('F6')]))
sh *= np.minimum(1, t_all[:n] / 1.4) * np.clip((5.4 - t_all[:n]) / 0.6, 0, 1)
place(mix, 0, sh, 0.012, pan=0.2, send=0.6)
# condensation micro-crackles
for k in range(70):
    tk = rng.uniform(0.2, 5.1)
    place(mix, tk, clink(rng.uniform(5000, 9000)) * 0.12, 0.12, pan=rng.uniform(-0.8, 0.8), send=0.5)

# light sweep in shot 1: airy whoosh following the strip light
place(mix, 0.15, sweep_noise(2.6, lambda u: 300 * (1 - u) + 3500 * u ** 1.5 + 200, q=0.5) * adsr(int(2.6 * SR), 1.4, 0.2, 0.8, 1.0), 0.05, pan=-0.3, send=0.4)

# pulse begins at 2.8: soft hit + glide
place(mix, 2.8, kick(44, 1.2, 0.3), 0.32, send=0.2)
place(mix, 2.75, sweep_noise(1.6, lambda u: 1800 - 1200 * u, q=0.6) * adsr(int(1.6 * SR), 0.1, 0.2, 0.6, 1.0), 0.06, pan=0.5, send=0.3)
for i in range(int((5.2 - 2.8) / 0.2)):
    tt = 2.8 + i * 0.2
    place(mix, tt, hat(), 0.05 + (0.03 if i % 2 == 0 else 0), pan=0.25)
for tt in (3.6, 4.4):
    place(mix, tt, kick(44, 0.8, 0.3), 0.18)

# whip into the lid shot
place(mix, 4.92, sweep_noise(0.42, lambda u: 600 + 6000 * np.sin(np.pi * u), q=0.45) * np.hanning(int(0.42 * SR)), 0.22, pan=-0.6, send=0.15)

# 6.0 tab click (metal)
n = int(0.3 * SR); tt = np.arange(n) / SR
click = filt(noise(n), 'high', 2500) * np.exp(-tt / 0.0025)
click += sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, a, d in [(2150, 0.5, 0.03), (3420, 0.4, 0.025), (5230, 0.3, 0.015), (7900, 0.2, 0.01)])
place(mix, 6.0, click, 0.42, send=0.2)
place(mix, 6.22, click * 0.6, 0.25, send=0.2)

# 6.4 PHSST
n = int(1.8 * SR); tt = np.arange(n) / SR
hiss = filt(noise(n), 'band', (1400, 11000)) * (np.minimum(1, tt / 0.004) * (0.75 * np.exp(-tt / 0.09) + 0.25 * np.exp(-tt / 0.55)))
hiss += filt(noise(n), 'high', 6000) * np.exp(-tt / 0.03) * 0.6
place(mix, CUE_POP := 6.4, np.stack([hiss, filt(noise(n), 'band', (1400, 11000)) * np.minimum(1, tt / 0.004) * (0.75 * np.exp(-tt / 0.09) + 0.25 * np.exp(-tt / 0.55))], 1), 0.42, send=0.25)
thump = np.sin(2 * np.pi * np.cumsum(70 + 120 * np.exp(-tt / 0.02)) / SR) * np.exp(-tt / 0.09)
place(mix, CUE_POP, thump, 0.35)
# fizz: dense crackle that thins out
dur = 4.2; n = int(dur * SR); tt = np.arange(n) / SR
rate = 2200 * np.exp(-tt / 0.6) + 260 * np.exp(-tt / 2.5)
fz = np.zeros((n, 2))
for ch in range(2):
    imp = (rng.random(n) < rate / SR) * rng.uniform(0.2, 1.0, n)
    fz[:, ch] = filt(signal.lfilter([1], [1, -0.6], imp), 'high', 3000)
fz *= np.clip((dur - tt) / 1.2, 0, 1)[:, None]
place(mix, CUE_POP + 0.02, fz, 0.34, send=0.2)

# riser into the drop
n = int(0.95 * SR); tt = np.arange(n) / SR
riser = filt(noise(n), 'band', (800, 9000)) * (tt / tt[-1]) ** 2.5
riser += 0.5 * np.sin(2 * np.pi * np.cumsum(220 + 700 * (tt / tt[-1]) ** 2) / SR) * (tt / tt[-1]) ** 2
place(mix, 8.0 - 0.95, riser, 0.2, send=0.3)

# ------------------------------------------------------------------ 8.0 – 18.0 : groove
chords = [  # (start, end, pad notes, bass, arp notes)
    (8.0, 9.6, ['D3', 'F3', 'A3', 'C4'], 'D2', ['D5', 'A4', 'F5', 'A4', 'C5', 'A4', 'F5', 'E5']),
    (9.6, 11.2, ['Bb2', 'D3', 'F3', 'A3'], 'Bb1', ['D5', 'Bb4', 'F5', 'Bb4', 'A5', 'F5', 'D5', 'F5']),
    (11.2, 12.8, ['F3', 'A3', 'C4', 'E4'], 'F2', ['C5', 'A4', 'F5', 'A4', 'E5', 'C5', 'A4', 'C5']),
    (12.8, 14.4, ['C3', 'E3', 'G3', 'D4'], 'C2', ['E5', 'C5', 'G5', 'C5', 'D5', 'G4', 'E5', 'G4']),
    (14.4, 16.0, ['Bb2', 'D3', 'F3', 'C4'], 'Bb1', ['D5', 'F5', 'C6', 'F5', 'D5', 'F5', 'Bb5', 'F5']),
    (16.0, 18.0, ['F3', 'A3', 'C4', 'G4'], 'F2', []),
]
for (a, b, pn, bn, arp) in chords:
    place(mix, a, pad([note(x) for x in pn], b - a + 0.6, attack=0.25, release=0.6, cutoff=2200), 0.06, send=0.35)
    # side-chained sub bass on the half-time grid
    for k in range(int(round((b - a) / BEAT))):
        tt = a + k * BEAT
        if 11.6 <= tt < 12.0:
            continue
        if tt >= 16.0:
            break
        place(mix, tt + 0.03, sub_note(note(bn), BEAT - 0.06) * (1 if k % 2 == 0 else 0.7), 0.16)
    # 16th-note pluck arpeggio (8ths here, motion-design energy)
    for k, nn in enumerate(arp * 2):
        tt = a + k * 0.2
        if tt >= b or 11.6 <= tt < 12.0:
            continue
        place(mix, tt, pluck(note(nn), 0.5, 0.8), 0.045, pan=0.35 if k % 2 else -0.35, send=0.35)

for bar in range(5):
    b0 = 8.0 + bar * BAR
    for off, kind in [(0.0, 'k'), (0.8, 'c'), (1.0, 'k'), (1.2, 'k2')]:
        tt = b0 + off
        if 11.55 <= tt < 12.0 or tt >= 15.2:
            continue
        if kind == 'k':
            place(mix, tt, kick(), 0.5)
        elif kind == 'k2':
            place(mix, tt, kick(50, 0.4, 0.6), 0.25)
        else:
            place(mix, tt, clap(), 0.2, send=0.3)
    for k in range(8):
        tt = b0 + k * 0.2
        if 11.55 <= tt < 12.0 or tt >= 15.2:
            continue
        place(mix, tt, hat(open_=(k == 6)), 0.07 if k % 2 == 0 else 0.11, pan=0.3)
        if k % 2 == 1:
            place(mix, tt + 0.1, hat(), 0.04, pan=-0.3)

# liquid swirl whoosh (8.0 -> 9.4, pans L -> R) + slow-mo low swirl
n = int(1.6 * SR)
sw = sweep_noise(1.6, lambda u: 250 + 2600 * np.sin(np.pi * min(1, u * 1.2)) ** 2, q=0.4) * adsr(n, 0.05, 0.3, 0.7, 0.9)
pan_l = np.linspace(-0.9, 0.9, n)
place(mix, 7.98, np.stack([sw * np.cos((pan_l + 1) * np.pi / 4), sw * np.sin((pan_l + 1) * np.pi / 4)], 1), 0.22, send=0.3)
place(mix, 8.55, filt(sweep_noise(2.8, lambda u: 500 - 300 * u, q=0.5), 'low', 900) * adsr(int(2.8 * SR), 0.4, 0.4, 0.7, 1.5), 0.12, send=0.4)
# liquid gloops (resonant down-chirps)
for tt, f in [(8.18, 900), (8.42, 700), (8.9, 1100), (9.7, 800)]:
    n = int(0.12 * SR); x = np.arange(n) / SR
    place(mix, tt, np.sin(2 * np.pi * np.cumsum(f * np.exp(-x / 0.05) + 200) / SR) * np.exp(-x / 0.035), 0.07, pan=rng.uniform(-0.5, 0.5), send=0.4)
# ice clinks as the cubes pass camera
for tt in (8.7, 9.25, 9.9, 10.55, 11.05):
    place(mix, tt, clink(rng.uniform(1700, 2600)), 0.11, pan=rng.uniform(-0.7, 0.7), send=0.5)
# continuing fizz bed
n = int(3.6 * SR); fb = np.zeros((n, 2))
for ch in range(2):
    imp = (rng.random(n) < 500 / SR) * rng.uniform(0.2, 1.0, n)
    fb[:, ch] = filt(imp, 'high', 4000)
place(mix, 8.0, fb * adsr(n, 0.2, 0.1, 1, 0.8)[:, None], 0.16)

# 11.6 drop-in whoosh (falling), 12.0 landing
place(mix, 11.6, sweep_noise(0.42, lambda u: 3500 - 3000 * u ** 0.7, q=0.5) * np.linspace(0.2, 1, int(0.42 * SR)) ** 2, 0.3, send=0.2)
n = int(2.6 * SR); tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * np.cumsum(36 + 70 * np.exp(-tt / 0.08)) / SR) * np.exp(-tt / 0.75)
boom += filt(noise(n), 'low', 260) * np.exp(-tt / 0.18) * 0.6
crack = filt(noise(n), 'band', (1200, 6000)) * np.exp(-tt / 0.02)
splash = filt(noise(n), 'band', (500, 7000)) * (np.minimum(1, tt / 0.01) * np.exp(-tt / 0.28)) * 0.7
place(mix, 12.0, np.tanh(1.3 * boom), 0.62, send=0.15)
place(mix, 12.0, crack, 0.28, send=0.4)
place(mix, 12.0, np.stack([splash, filt(noise(n), 'band', (500, 7000)) * (np.minimum(1, tt / 0.01) * np.exp(-tt / 0.28)) * 0.7], 1), 0.25, send=0.35)
for k in range(40):  # droplets landing back on the lacquer
    place(mix, 12.05 + rng.exponential(0.25), clink(rng.uniform(2500, 6000)) * 0.15, 0.25, pan=rng.uniform(-0.8, 0.8), send=0.4)

# 14.4 lift into the end card + 15.2 sting
place(mix, 14.4 - 0.8, sweep_noise(0.8, lambda u: 400 + 5000 * u ** 2, q=0.6) * np.linspace(0, 1, int(0.8 * SR)) ** 2, 0.1, send=0.4)
place(mix, 14.4, kick(42, 1.4, 0.2), 0.3, send=0.3)
for f, d, g in [(note('F5'), 0.0, 0.07), (note('A5'), 0.05, 0.05), (note('C6'), 0.1, 0.04), (note('F6'), 0.16, 0.025)]:
    place(mix, 15.2 + d, bell(f, 3.0), g, pan=rng.uniform(-0.4, 0.4), send=0.7)
place(mix, 15.2, kick(38, 2.0, 0.15), 0.38, send=0.4)
# 16.35 glint on the wordmark shine
n = int(0.5 * SR); tt = np.arange(n) / SR
glint = np.sin(2 * np.pi * np.cumsum(4200 + 5000 * tt / tt[-1]) / SR) * np.exp(-tt / 0.12) * np.minimum(1, tt / 0.01)
place(mix, 16.35, glint, 0.03, pan=-0.4, send=0.8)
for k in range(12):
    place(mix, 16.4 + k * 0.05, clink(rng.uniform(6000, 9000)) * 0.1, 0.12, pan=-0.6 + k * 0.08, send=0.7)

# ------------------------------------------------------------------ reverb + master
ir_n = int(2.6 * SR); tt = np.arange(ir_n) / SR
ir = np.stack([noise(ir_n), noise(ir_n)], 1) * np.exp(-tt / 0.55)[:, None]
ir = filt(ir, 'low', 6500, 2)
ir[: int(0.012 * SR)] = 0  # pre-delay
wet = np.stack([signal.fftconvolve(verb_send[:, c], ir[:, c])[:N] for c in range(2)], 1)
wet = filt(wet, 'high', 180, 2)
mix += wet * 0.22

# glue: gentle low-shelf trim of mud, then soft-knee compression + limiter
mix = filt(mix, 'high', 28, 2)
env = np.sqrt(signal.sosfilt(sos('low', 8, 1), mix[:, 0] ** 2 + mix[:, 1] ** 2) + 1e-9)
thr = np.percentile(env, 92)
gain = np.where(env > thr, (thr / env) ** 0.35, 1.0)
mix *= gain[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.35) / np.tanh(1.35)
mix *= 10 ** (-1.0 / 20)
# fade tail
mix[-int(0.25 * SR):] *= np.linspace(1, 0, int(0.25 * SR))[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav'
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out, f'{DUR}s', 'peak', float(np.max(np.abs(mix))), 'rms dB', float(20 * np.log10(np.sqrt(np.mean(mix ** 2)))))
