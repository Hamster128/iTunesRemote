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
| `mpvSamplerateForce44` | number | `0` | Force a specific sample rate for 44.1 kHz tracks (0 = disabled) |
| `mpvSamplerateMin48` | number | `0` | Minimum sample rate for 48 kHz tracks (0 = disabled) |
| `mpvSamplerateMax48` | number | `0` | Maximum sample rate for 48 kHz tracks (0 = disabled) |
| `mpvSamplerateForce48` | number | `0` | Force a specific sample rate for 48 kHz tracks (0 = disabled) |
| `mpvBitsPerSample` | number | `32` | Bits per sample for the audio device |
| `mpvSamplerateWaitMS` | number | `1000` | Milliseconds to wait after changing the sample rate |
| `hqpHost` | string | `"127.0.0.1"` | HQPlayer control API host |
| `hqpPort` | number | `2727` | HQPlayer control API port |

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
