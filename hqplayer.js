const net = require('net');
const exec = require('child_process').exec;
const moment = require('moment');

let hqpSocket = null;
let playlist = [];
let playIdx = 0;
let itunes;
let settings;

//---------------------------------------------------------------------------------------
// EXPORTED STATE VARIABLES (Identical to MPV interface)
//---------------------------------------------------------------------------------------
exports.state = false;
exports.position = 0;
exports.duration = 0;
exports.id_low = 0;
exports.id_high = 0;
exports.repeat = 0;
exports.shuffle = 0;
exports.sampleRate = 0;
exports.mediaTitle = null;
exports.volume = 100;
exports.mode = "";

let idleState = true;
let changingSampleRate = false;
let positionInterval = null;

//---------------------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => {
    if (!ms) return resolve();
    setTimeout(resolve, ms);
  });
}

// Low-level helper to dispatch socket commands to HQPlayer Control API
function sendHqpCommand(cmd) {
  if (hqpSocket && !hqpSocket.destroyed) {
    hqpSocket.write(`${cmd}\n`);
  }
}

//---------------------------------------------------------------------------------------
// STARTUP & INITIALIZATION
//---------------------------------------------------------------------------------------
exports.startup = function (itunesP, settingsP) {
  if (hqpSocket) return;

  console.log("hqplayer startup");

  itunes = itunesP;
  settings = settingsP;

  const host = settings.hqpHost || '127.0.0.1';
  const port = settings.hqpPort || 2727;

  hqpSocket = new net.Socket();

  hqpSocket.connect(port, host, () => {
    console.log(`hqplayer connected on ${host}:${port}`);
    exports.setVolume(exports.volume);
  });

  hqpSocket.on('data', (data) => {
    const response = data.toString();
    // Parse asynchronous status pushes from HQPlayer (e.g. state, position, track changes)
    if (response.includes('PAUSED') || response.includes('STOPPED')) {
      exports.state = false;
    } else if (response.includes('PLAYING')) {
      exports.state = true;
    }
  });

  hqpSocket.on('error', (err) => {
    console.error("hqplayer socket error:", err.message);
  });

  hqpSocket.on('close', () => {
    console.log("hqplayer socket closed");
    exports.state = false;
  });

  // Simulated 100ms timeposition ticker (matches MPV's time_update: 0.1 behavior)
  let lastPlayedCount = null;

  positionInterval = setInterval(() => {
    if (!exports.state || playIdx === null || playIdx < 0 || playIdx >= playlist.length) {
      return;
    }

    // Increment simulated time position
    exports.position += 0.1;

    const seconds = exports.position;

    // Trigger sample rate checks for next track
    if (seconds > exports.duration - 0.4) {
      if (playIdx < playlist.length - 1) {
        checkSampleRateOfDevice(playIdx + 1);
      }
    } else {
      checkSampleRateOfDevice(playIdx);
    }

    // Handle iTunes played count increment
    if (seconds >= exports.duration - 10) {
      if (lastPlayedCount !== playlist[playIdx]) {
        lastPlayedCount = playlist[playIdx];
        itunes.setPlayedCount(playlist[playIdx]);
        playlist[playIdx].playedCount++;
        playlist[playIdx].playedDate = moment().format('YYYY-MM-DD HH:mm');
        console.log(`hqplayer playedCount=${playlist[playIdx].playedCount} playedDate=${playlist[playIdx].playedDate} for ${playlist[playIdx].name}`);
      }
    } else {
      lastPlayedCount = null;
    }

    // Advance track when current track reaches end of duration
    if (exports.duration > 0 && seconds >= exports.duration) {
      exports.nextTrack();
    }
  }, 100);
};

//---------------------------------------------------------------------------------------
// QUIT
//---------------------------------------------------------------------------------------
exports.quit = function () {
  if (!hqpSocket) return;

  console.log("hqplayer quit");

  if (positionInterval) clearInterval(positionInterval);

  sendHqpCommand("STOP");
  hqpSocket.destroy();
  hqpSocket = null;
  exports.state = false;
};

//---------------------------------------------------------------------------------------
exports.updateSettings = function(overrides) {
  for (let key in overrides) {
    if (key in settings) {
      settings[key] = overrides[key];
    }
  }
};

//---------------------------------------------------------------------------------------
// SAMPLE RATE HANDLING
//---------------------------------------------------------------------------------------
function checkSampleRateOfDevice(idx) {
  if (idx === null || idx < 0 || idx >= playlist.length) {
    console.log("checkSampleRateOfDevice invalid idx", idx);
    return false;
  }

  const tr = playlist[idx];
  let wantedRate = 0, force = 0, min = 0, max = 0;

  if ((tr.sampleRate % 48000) === 0) {
    max = settings.mpvSamplerateMax48;
    min = settings.mpvSamplerateMin48;
    force = settings.mpvSamplerateForce48;
  } else if ((tr.sampleRate % 44100) === 0) {
    max = settings.mpvSamplerateMax44;
    min = settings.mpvSamplerateMin44;
    force = settings.mpvSamplerateForce44;
  }

  wantedRate = tr.sampleRate;

  if (force) {
    wantedRate = force;
  } else {
    if (min && wantedRate < min) wantedRate = min;
    if (max && wantedRate > max) wantedRate = max;
  }

  return exports.setSampleRate(wantedRate);
}

let wantedSampleRate = 0;

exports.setSampleRate = function (wantedRate) {
  if (!wantedRate || wantedRate === exports.sampleRate) {
    return false;
  }

  if (changingSampleRate) {
    wantedSampleRate = wantedRate;
    return;
  }

  exports.setVolume(0);
  changingSampleRate = true;
  exports.sampleRate = wantedRate;

  console.log("hqplayer setting sample rate", wantedRate);

  exec(`SoundVolumeView.exe /SetDefaultFormat "${settings.wait4AudioDevice}" ${settings.mpvBitsPerSample} ${wantedRate}`, { encoding: 'utf16' }, async function (err, stdout, stderr) {
    console.log("hqplayer setting sample rate wait", exports.sampleRate, stdout ? stdout.toString() : '', err);
    await sleep(settings.mpvSamplerateWaitMS);
    console.log("hqplayer setting sample rate done", exports.sampleRate);

    // Send target rate directive to HQPlayer engine
    sendHqpCommand(`SET_RATE ${exports.sampleRate}`);
    
    exports.setPlayerPosition(0);
    exports.setVolume(exports.volume);
    changingSampleRate = false;

    if (wantedSampleRate) {
      exports.setSampleRate(wantedSampleRate);
      wantedSampleRate = 0;
    }
  });

  return true;
};

//---------------------------------------------------------------------------------------
// CONTROLS & STATE MODIFIERS
//---------------------------------------------------------------------------------------
exports.setVolume = function (vol) {
  if (hqpSocket && !changingSampleRate) {
    // HQPlayer expects volume in dB scale (-100 to 0) or percentage depending on engine version
    const dbVol = vol === 0 ? -100 : Math.round((vol - 100) * 0.6);
    sendHqpCommand(`SET_VOLUME ${dbVol}`);
  }
  exports.volume = vol;
};

exports.currentTrack = function (cb) {
  if (playIdx === null || playIdx < 0 || playIdx >= playlist.length) {
    return cb({ "error": "no track" });
  }

  let track = playlist[playIdx];
  track.idx = playIdx;
  track.count = playlist.length;

  cb(structuredClone(track));
};

exports.active = function () {
  return playlist.length > 0;
};

exports.play = function () {
  console.log("hqplayer play");
  sendHqpCommand("PLAY");
  exports.state = true;
};

exports.pause = function () {
  console.log("hqplayer pause");
  sendHqpCommand("PAUSE");
  exports.state = false;
};

//---------------------------------------------------------------------------------------
// FADERS
//---------------------------------------------------------------------------------------
async function fadeOut() {
  exports.setVolume(0);
  await sleep(200);
}

async function fadeIn() {
  exports.setVolume(exports.volume);
}

//---------------------------------------------------------------------------------------
// NAVIGATION
//---------------------------------------------------------------------------------------
exports.backTrack = async function () {
  console.log("hqplayer backTrack");

  if (exports.position > 2) {
    this.setPlayerPosition(0);
    exports.play();
    exports.setVolume(exports.volume);
    return;
  }

  if (playIdx === null || playIdx <= 0) return;

  if (this.active()) await fadeOut();

  playIdx--;
  loadCurrentTrackState();

  let sampleRateChanged = checkSampleRateOfDevice(playIdx);

  sendHqpCommand(`PLAY_URI "${playlist[playIdx].location}"`);
  exports.state = true;

  if (!sampleRateChanged) {
    exports.setVolume(exports.volume);
  }
};

exports.nextTrack = async function () {
  console.log("hqplayer nextTrack");

  if (playIdx === null || playIdx < 0 || playIdx + 1 >= playlist.length) {
    return;
  }

  if (this.active()) await fadeOut();

  playIdx++;
  loadCurrentTrackState();

  let sampleRateChanged = checkSampleRateOfDevice(playIdx);

  sendHqpCommand(`PLAY_URI "${playlist[playIdx].location}"`);
  exports.state = true;

  if (!sampleRateChanged) {
    exports.setVolume(exports.volume);
  }
};

exports.setPlayerPosition = async function (seconds) {
  if (this.active()) {
    await fadeOut();
  } else {
    exports.setVolume(0);
  }

  exports.position = seconds;
  sendHqpCommand(`SEEK ${Math.round(seconds)}`);
  exports.play();

  if (seconds > 0) {
    await fadeIn();
  } else {
    exports.setVolume(exports.volume);
  }
};

// Internal sync helper for tracking current playlist item metadata
function loadCurrentTrackState() {
  if (playIdx < 0 || playIdx >= playlist.length) return;

  const tr = playlist[playIdx];
  exports.position = 0;
  exports.duration = tr.duration || 0;
  exports.id_low = tr.id_low;
  exports.id_high = tr.id_high;
  exports.mediaTitle = tr.name || tr.title || "";

  if (tr.kind === 3) { // Radio
    tr.mediaTitle = exports.mediaTitle;
  }
}

//---------------------------------------------------------------------------------------
// PLAYLIST OPERATIONS
//---------------------------------------------------------------------------------------
exports.playAlbumFrom = async function (msg, cb) {
  if (this.active()) await fadeOut();

  sendHqpCommand("STOP");
  exports.setVolume(exports.volume);
  exports.mode = "album";

  itunes.albumTracks(msg, async function (tracks) {
    playlist = [];
    playIdx = 0;
    let found = false;

    for (let tr of tracks) {
      if (tr.id_low === msg.id_low && tr.id_high === msg.id_high) {
        found = true;
      }
      if (!found || !tr.enabled) continue;

      playlist.push(tr);

      if (playlist.length === 1) {
        checkSampleRateOfDevice(0);
      }
    }

    if (playlist.length > 0) {
      loadCurrentTrackState();
      sendHqpCommand(`PLAY_URI "${playlist[0].location}"`);
      exports.state = true;
    }

    cb();
  });
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const LIMIT_FIRST_LOAD = 300;

exports.playTrackInList = async function (msg, cb) {
  if (this.active()) await fadeOut();

  sendHqpCommand("STOP");
  exports.setVolume(exports.volume);
  exports.mode = "list";

  msg.skip = 0;
  msg.count = 999999999;

  if (msg.idx === -1) {
    msg.count = LIMIT_FIRST_LOAD;
  }

  itunes.playlistTracks(msg, async function (tracks) {
    console.log(`hqplayer playTrackInList msg.idx=${msg.idx} tracks=${tracks.length}`);

    playlist = [];
    playIdx = 0;

    if (msg.idx === -1) { // shuffle
      if (tracks.length > LIMIT_FIRST_LOAD) {
        tracks.pop();
      }

      msg.idx = 0;
      shuffleArray(tracks);

      let tr = tracks.pop();
      playlist.push(tr);
      checkSampleRateOfDevice(0);

      tr = tracks.pop();
      playlist.push(tr);

      loadCurrentTrackState();
      sendHqpCommand(`PLAY_URI "${playlist[0].location}"`);
      exports.state = true;
      cb();

      msg.skip = LIMIT_FIRST_LOAD;
      msg.count = 999999999;

      let moreTracks = await new Promise(function (resolve) {
        setTimeout(function () {
          itunes.playlistTracks(msg, async function (tracks) {
            console.log(`hqplayer playTrackInList 2nd tracks=${tracks.length}`);
            resolve(tracks);
          });
        }, 200);
      });

      tracks.push(...moreTracks);
      shuffleArray(tracks);
    }

    for (let i = msg.idx; i < tracks.length; i++) {
      const tr = tracks[i];
      playlist.push(tr);

      if (playlist.length === 1) {
        checkSampleRateOfDevice(0);
      }

      if (tr.kind === 3) break; // Radio
    }

    if (msg.skip === LIMIT_FIRST_LOAD) return;

    if (playlist.length > 0) {
      loadCurrentTrackState();
      sendHqpCommand(`PLAY_URI "${playlist[0].location}"`);
      exports.state = true;
    }

    cb();
  });
};

exports.playTrack = function (msg, cb) {
  itunes.getTrack(msg, async function (tr) {
    if (exports.state) {
      playlist.push(tr);
      return;
    }

    sendHqpCommand("STOP");
    playlist = [];
    playIdx = 0;

    playlist.push(tr);
    checkSampleRateOfDevice(0);

    loadCurrentTrackState();
    sendHqpCommand(`PLAY_URI "${tr.location}"`);
    exports.state = true;
    cb();
  });
};