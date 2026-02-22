# iTunesRemote Technical Documentation

## 1. Overview
iTunesRemote is a Windows-hosted Node.js service that exposes a browser UI for controlling iTunes playback and library functions from phones, tablets, and TVs on the local network.

The runtime also supports:
- Optional playback through `mpv` instead of native iTunes playback
- Optional Devialet amplifier control over UDP
- Optional external volume control via local HTTP (`vstVolumeControl`)
- Audio device orchestration (auto-start/stop behavior when a target device appears/disappears)

## 2. High-Level Architecture

### 2.1 Components
- `index.js`: Main process, HTTP/Socket server, orchestration, state polling, automation.
- `itunes_api/index.js`: Serialized command queue to iTunes via WSH (`cscript`) scripts.
- `itunes_api/scripts/*`: JScript/WSH scripts that call iTunes COM API.
- `mpv_player.js`: Playback and queue abstraction for mpv mode.
- `devialet.js`: UDP status parsing and command transmission to Devialet devices.
- `public/*`: Frontend SPA-like UI (HTML/CSS/JS + socket.io client).
- `con2log.js`: Console interception and daily log file management.

### 2.2 Data/Control Flow
1. Browser connects via Socket.IO.
2. Frontend emits commands (`play`, `pause`, `playlistTracks`, etc.).
3. `index.js` routes command to:
- iTunes script API (`itunes_api`), or
- mpv abstraction (`mpv_player.js`) when enabled.
4. Backend polls player state and broadcasts:
- `state`
- `track`
- `deviceState`
- `volume`
5. Frontend updates UI based on pushed events.

## 3. Runtime and Environment

### 3.1 Platform
- Windows is required for current implementation (COM, `.exe` tools, device automation).

### 3.2 Node Dependencies (`package.json`)
- `express@4.13.4`
- `socket.io@4.7.1`
- `crc`
- `moment`
- `node-mpv`

### 3.3 External Binaries Used
- `C:\Program Files\iTunes\iTunes.exe`
- `nircmdc.exe`
- `EndPointController.exe`
- `SoundVolumeView.exe`
- `SystemRequired.exe`
- `ImageLibC.exe`
- `mpv.exe` (or `mpv\mpv.exe` for local package in subfolder)

## 4. Startup and Lifecycle

### 4.1 Main Startup Sequence
1. Load `settings.json`.
2. Start Express static host + Socket.IO.
3. Start periodic audio-device checks if `wait4AudioDevice` is configured.
4. Optionally start Devialet listener (`settings.devialet`).
5. Start state polling loop (`getState`) once playback path is active.
6. Start periodic AirPlay monitor (`current_song.txt`) loop.

### 4.2 Network Binding
- Starts at port `81`.
- If `EADDRINUSE`, increments port until bind succeeds.
- Console prints first non-internal IPv4 address and final URL.

## 5. Settings Reference (`settings.json`)

## 5.1 Playback/Audio
- `mpv` (`bool`): Use `mpv_player.js` playback path.
- `startVolume` (`0..100`): Initial volume after device activation.
- `wait4AudioDevice` (`string`): Audio endpoint name to wait for.
- `wait4AudioDeviceSeconds` (`number`): Delay before accepting device as stable.

## 5.2 mpv Sample Rate Controls
- `mpvBitsPerSample`
- `mpvSamplerateWaitMS`
- `mpvSamplerateMax44`, `mpvSamplerateMin44`, `mpvSamplerateForce44`
- `mpvSamplerateMax48`, `mpvSamplerateMin48`, `mpvSamplerateForce48`

## 5.3 Volume Routing
- `mpvVolumeControl` (`bool`): Keep system volume max; control mpv internal volume.
- `vstVolumeControl` (`bool`): Volume via `http://127.0.0.1:8088/volume?value=<0..100>`.

## 5.4 Process Automation
- `startAlso` (`path`): Additional process to start with audio lifecycle.
- `killAlso` (`process name`): Additional process to stop when audio device disappears.

## 5.5 Devialet
- `devialet` (`bool`)
- `devialetSource` (`string`, optional): Required source name to treat device as active.
- `otherSourceDevice` (`string`, optional): Fallback output device when source mismatch.

## 5.6 UI/Library
- `playlists`: Per-playlist client preferences (mode/sort order).
- `dsp`: User flag used by UI and DSP toggle control.

## 6. Socket.IO API

### 6.1 Client -> Server Events
- Transport controls: `play`, `pause`, `backTrack`, `nextTrack`, `setPlayerPosition`
- Volume/mode: `setSoundVolume`, `setRepeat`, `setShuffle`, `eq_apo`
- Library: `playLists`, `playlistTracks`, `albumTracks`, `artistAlbums`, `search`
- Queue/list operations: `playTrack`, `playTrackInList`, `playQueueFrom`, `playAlbumFrom`
- Playlist management: `addList`, `renameList`, `removeList`
- Track metadata/list edits: `setRating`, `setEnabled`, `addTrackToList`, `removeTrackFromList`, `moveTrackInList`
- Configuration/logging: `settings`, `log`

### 6.2 Server -> Client Events
- `state`
- `track`
- `volume`
- `deviceState`
- `playLists`
- `playlistTracks`
- `albumTracks`
- `artistAlbums`
- `searchResult`
- `tracksPlaylists`
- `addedTrackToList`, `removedTrackFromList`, `movedTrackInList`
- `active` (system render activity detected)

## 7. iTunes Integration Details

### 7.1 Queueing Model
`itunes_api/index.js` serializes all iTunes commands through an in-memory queue:
- Prevents concurrent COM script calls
- Preserves operation order
- Uses callback completion to trigger next job

### 7.2 Script Execution
- Command shell: `cscript /Nologo /U //E:jscript`
- Working dir: `itunes_api/scripts`
- For some scripts stdout is captured by redirecting to a temp file due to encoding/pipe behavior.

### 7.3 Script Responsibilities
Scripts provide:
- Playback commands
- Player state and current track
- Artwork extraction
- Playlist CRUD and ordering
- Library search
- Track metadata updates (rating/enabled/played count)

## 8. mpv Mode Details

### 8.1 Behavior
- Maintains its own playlist mirror from iTunes metadata.
- Emits current state via shared polling pathway.
- Handles seek/next/back with fade and sample-rate adaptation.
- For shuffle with large lists: loads first segment, starts quickly, then asynchronously appends more.

### 8.2 Sample Rate Switching
When target track rate differs from current output rate:
1. Mute mpv volume.
2. Call `SoundVolumeView.exe /SetDefaultFormat`.
3. Wait `mpvSamplerateWaitMS`.
4. Apply mpv resample filter (`lavfi aresample ... soxr`).
5. Restore volume and continue.

## 9. Devialet Integration Details
- Listens for status datagrams on UDP `45454`.
- Sends commands to UDP `45455`.
- Supports power, mute/unmute, source selection, and volume in 0.5 dB steps.
- Uses CRC16 framing and packet/command counters.

## 10. Audio Device Orchestration
`checkAudioDevice()` loop:
1. Enumerates endpoints via `EndPointController.exe`.
2. Validates configured target endpoint presence and source constraints.
3. On activation:
- Stops iTunes if needed
- Selects endpoint as default device
- Applies initial volume
- Starts iTunes/mpv/aux process
4. On deactivation:
- Stops polling
- Closes iTunes and aux process
- Quits mpv
- Updates device/UI state

## 11. AirPlay Interop (`current_song.txt`)
- Polls every 500ms for file mtime changes.
- When present and valid: pauses iTunes/mpv, sets synthetic track (`kind: 999`), broadcasts to UI.
- Handles ad-mute behavior when line content equals `"Werbung"`.
- Clears AirPlay override when file disappears.

## 12. Logging and Diagnostics
- `con2log.js` overrides `console.log/error`.
- Logs are written to `logs/YYYY-MM-DD.log`.
- Log retention is configurable (`Con2log.keepFilesDays` set to 7 in main process).
- Captures `uncaughtException` and `unhandledRejection`.

## 13. Running the Service

### 13.1 Install
```powershell
npm install
```

### 13.2 Start
```powershell
node index.js
```

### 13.3 Access
Use URL printed at startup:
`http://<host-ip>:<port>`

## 14. Known Technical Risks
- No authentication/authorization on Socket.IO control channel.
- Command construction in `itunes_api/index.js` uses string concatenation for shell execution.
- Express version is old (`4.13.4`).
- Tight coupling to local executables and absolute paths.
- Limited automated test coverage.

## 15. Suggested Improvement Backlog
1. Add auth/token gate and local-network restrictions.
2. Replace shell string execution with `execFile` + argument arrays where possible.
3. Upgrade Express and refresh dependency lock.
4. Split `index.js` into modules (socket handlers, device manager, airplay manager, artwork service).
5. Add integration smoke tests around key command flows and device transitions.

