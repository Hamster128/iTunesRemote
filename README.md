# iTunesRemote
nodejs app which provides a web app for smart phones and TVs to remote control iTunes

for more informations see the wiki
https://github.com/Hamster128/iTunesRemote/wiki

Technical documentation:
- `TECHNICAL_DOCUMENTATION.md`

## Settings

All settings are stored in `settings.json`.

### Audio Device
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `wait4AudioDevice` | string | - | Name of the Windows audio device to wait for on startup |
| `wait4AudioDeviceSeconds` | number | `0` | Seconds to wait before accepting the audio device |
| `devialet` | boolean | `false` | Enable Devialet speaker control |
| `devialetSource` | string | - | Name of the Devialet source to use |
| `otherSourceDevice` | string | - | Name of the audio device to switch to when the main device is off |

### Startup
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `startVolume` | number | `30` | Volume (0-100) when starting the player |
| `startAlso` | string | - | Path to an additional application to start with iTunes |
| `killAlso` | string | - | Process name to kill when stopping iTunes |

### Player
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `mpv` | boolean | `false` | Use MPV as audio player instead of iTunes |
| `hqp` | boolean | `false` | Use HQPlayer as audio player instead of iTunes |

### MPV / HQPlayer Sample Rate Control
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `mpvSamplerateMin44` | number | `0` | Minimum sample rate for 44.1 kHz tracks (0 = disabled) |
| `mpvSamplerateMax44` | number | `0` | Maximum sample rate for 44.1 kHz tracks (0 = disabled) |
| `mpvSamplerateMin48` | number | `0` | Minimum sample rate for 48 kHz tracks (0 = disabled) |
| `mpvSamplerateMax48` | number | `0` | Maximum sample rate for 48 kHz tracks (0 = disabled) |
| `mpvBitsPerSample` | number | `32` | Bits per sample for the audio device |
| `mpvSamplerateWaitMS` | number | `1000` | Milliseconds to wait after changing the sample rate |
| `mpvResampleFilter` | string | SWR/Blackman-Nuttall (see below) | MPV aresample filter parameters applied after sample rate changes |
| `hqpHost` | string | `"127.0.0.1"` | HQPlayer control API host |
| `hqpPort` | number | `2727` | HQPlayer control API port |

### MPV Resample Filter

The `mpvResampleFilter` setting controls the audio resampling filters applied via MPV's `aresample` filter when the sample rate is changed. It consists of FFmpeg `aresample` options appended to `aresample=<sampleRate>:`.

The default uses the SWR resampler with a Blackman-Nutall window:

```
osf=s32:resampler=swr:filter_size=128:resample_cutoff=0.70:filter_type=blackman_nuttall:exact_rational=1
```

Alternative configurations (based on HQPlayer filter characteristics) are documented below. To use one, replace the value of `mpvResampleFilter` in `settings.json`.

#### HQPlayer Sinc-L (highest frequency extension, but less dynamic)

Like HQPlayer Sinc-L. Uses the SOX resampler with strict linear phase and a sharp Nyquist transition.

- `phase=50` — Enforces strict linear phase (symmetric ringing before and after impulse, exactly like Sinc-L).
- `passband_end=99` — Extends the flat frequency response right up to the edge of the audible band.
- `stopband_begin=100` — Forces an extremely sharp cut-off transition at Nyquist.

```
osf=s32:resampler=soxr:precision=32:passband_end=99:stopband_begin=100:phase=50
```

#### HQPlayer Sinc-Mx (less frequency extension, but more dynamic)

Like HQPlayer Sinc-Mx. Uses an intermediate phase that shifts energy to post-ringing while suppressing pre-ringing.

- `phase=25` — Intermediate Phase. Shifts most of the energy to post-ringing while significantly suppressing pre-ringing.
- `passband_end=95` & `stopband_begin=105` — Relaxes the transition band slightly to allow a smoother, more natural time-domain decay (less ringing energy overall).

```
osf=s32:resampler=soxr:precision=32:passband_end=95:stopband_begin=105:phase=25
```

#### NOS-like dynamic with SOX (minimum phase)

NOS-like dynamics using the SOX resampler. Eliminates pre-ringing while maintaining a gentle roll-off.

- `phase=0` — Pure minimum phase. Completely eliminates pre-ringing energy before transients, keeping leading edges (snare hits, plucks, leading-edge detail) 100% identical to NOS timing.
- `passband_end=73` — Flat Passband to ~16 kHz. Setting passband_end to 73% of Nyquist (approx. 16 kHz for 44.1 kHz redbook audio) ensures total linear transparency through the critical midrange and lower treble.
- `stopband_begin=125` — Gentle, smooth roll-off instead of a steep "brickwall" cut that causes harsh ringing. Pushing the stopband further out creates a relaxed, gradual roll-off. This softly attenuates ultrasonic aliases (like NOS) without creating sharp phase distortion or treble glare.
- `cheby=1` — Enables a Chebyshev windowing function which allows a tiny, ultra-smooth ripple in exchange for an even softer, rounder high-frequency roll-off. This guarantees zero harshness.

```
osf=s32:resampler=soxr:precision=32:phase=0:passband_end=73:stopband_begin=125:cheby=1
```

#### NOS dynamic with SWR (default)

NOS-like dynamics using the SWR resampler with 64-bit precision and less post-ringing than SOX.

- `filter_size=128` — Keeps the tap count very low. This prevents time-domain energy from "smearing" across time, giving you the immediate, punchy transient response of NOS. (Note: SOX can be set to `phase=0` but still has long postringing because of long filters.)
- `resample_cutoff=0.70` — Keeps the response flat through ~15.4 kHz (for 44.1 kHz material) before initiating a soft roll-off, removing all harsh upper-frequency glare.
- `filter_type=blackman_nutall` — Provides exceptional stopband rejection (-98 dB attenuation on first side-lobe) while maintaining a gentle, natural transition slope without high-frequency harshness. (Note: SOX uses Kaiser windowing, which creates sharp, steep cuts.)

```
osf=s32:resampler=swr:filter_size=128:resample_cutoff=0.70:filter_type=blackman_nuttall:exact_rational=1
```

### Volume Control
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `mpvVolumeControl` | boolean | `false` | Use MPV internal volume control |
| `vstVolumeControl` | boolean | `false` | Use external VST volume control |
| `vstVolumeControlUrl` | string | `"http://127.0.0.1:8088/volume?value="` | URL for VST volume control |
| `vstVolumeControlMinDb` | number | `-70` | Minimum dB value for VST volume control |
| `vstVolumeControlMaxDb` | number | `0` | Maximum dB value for VST volume control |

### UI
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `dsp` | boolean | `false` | Show DSP (sample rate) indicator on the player page |

### EQ APO Config Overrides

The EqualizerAPO config file (`config.txt`) can contain a special comment line to override settings at runtime:

```
# settings={"key": value, "key": value}
```

The JSON in this line is parsed and applied to the in-memory settings. Currently supported override keys are all settings from `settings.json`, for example:

```
# settings={"mpvSamplerateMin44":88200,"mpvSamplerateMin48":96000}
```

This overrides `mpvSamplerateMin44` to `88200` and `mpvSamplerateMin48` to `96000` without modifying `settings.json`.

### Playlists

The `playlists` object stores playlist-specific settings. Each playlist is identified by its `id_low` and `id_high` (or `"undefined"`). Each entry can have:

| Key | Type | Description |
|-----|------|-------------|
| `mode` | number | Playlist mode (0 = normal, 1 = shuffle) |
| `sortOrder` | number | Sort order (0 = ascending, 1 = descending) |
