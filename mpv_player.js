const exec = require('child_process').exec;
const mpv = require('node-mpv');

let mpvPlayer;

let playlist = [];
let playIdx  = 0;
let itunes;
let settings;

//---------------------------------------------------------------------------------------
exports.state = false;
exports.position = 0;
exports.duration = 0;
exports.repeat = 0;
exports.shuffle = 0;
exports.sampleRate = 0;
exports.mediaTitle = null;
exports.volume = 100;

let idleState, changingSampleRate;

//---------------------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve, reject)=>{

    if(!ms) {
      return resolve();
    }

    setTimeout(resolve, ms);
  });
}

//---------------------------------------------------------------------------------------
exports.startup = function(itunesP, settingsP) {

  if(mpvPlayer)
    return;

  console.log("mpv startup");

  itunes = itunesP;
  settings = settingsP;

  const opts = {
    binary: "mpv.exe",
    audio_only: true,
    time_update: 0.1
  };
  
  mpvPlayer = new mpv(opts); 

  mpvPlayer.observeProperty("core-idle", 20);
  mpvPlayer.volume(exports.volume);

  //---------------------------------------------------------------------------------------
  mpvPlayer.on('statuschange', function(status){
    // console.log("mpv statuschange", JSON.stringify(status));
    playIdx = status['playlist-pos'];

    if(status['core-idle'] != idleState) {
      console.log("mpv core-idle", status['core-idle']);
      idleState = status['core-idle'];
    }

    if(status['media-title'] != exports.mediaTitle) {
      console.log("mpv media-title", status['media-title']);
    }

    exports.state = !status['core-idle'];
    exports.mediaTitle = status['media-title'];

    if(playIdx === null || playIdx < 0 || playIdx >= playlist.length) 
      return;

    const tr = playlist[playIdx];
    exports.duration = status.duration;
    
    if(typeof status.duration != "number") {
      exports.duration = 0;
    }

    if(tr.kind == 3) { // radio
      tr.mediaTitle = exports.mediaTitle;
    }
  });

  //---------------------------------------------------------------------------------------
  mpvPlayer.on('started', function() {
    console.log("mpv started");
    exports.state = true;
  });

  //---------------------------------------------------------------------------------------
  mpvPlayer.on('stopped', function() {
    console.log("mpv stopped");
    exports.state = false;
  });

  //---------------------------------------------------------------------------------------
  mpvPlayer.on('paused', function() {
    console.log("mpv paused");
    exports.state = false;
  });

  //---------------------------------------------------------------------------------------
  mpvPlayer.on('resumed', function() {
    console.log("mpv resumed");
    exports.state = true;
  });

  //---------------------------------------------------------------------------------------
  let lastPlayedCount = null;

  mpvPlayer.on('timeposition', function(seconds) {  // every 100 ms
    exports.position = seconds;

    if(seconds > exports.duration - 0.4) {

      if(playIdx === null || playIdx < 0) {
        return;
      } 

      if(lastPlayedCount != playlist[playIdx]) {
        console.log(`mpv playedCount++ for ${playlist[playIdx].name}`);
        lastPlayedCount = playlist[playIdx];
        itunes.setPlayedCount(playlist[playIdx]);
        playlist[playIdx].playedCount ++;
      }

      if(playIdx >= playlist.length-1) {
        return;
      }

      checkSampleRateOfDevice(playIdx + 1);
    } else {
      lastPlayedCount = null;
    }
  });
}

//---------------------------------------------------------------------------------------
exports.quit = function() {
  if(!mpvPlayer)
    return;

  console.log("mpv quit");

  mpvPlayer.quit();
  mpvPlayer = null;
}

//---------------------------------------------------------------------------------------
function checkSampleRateOfDevice(idx) {
  if(idx === null || idx < 0 || idx >= playlist.length) 
  {
    console.log("checkSampleRateOfDevice invalid idx", idx);
    return false;
  }

  const tr = playlist[idx];
  let wantedRate = 0, force = 0, max = 0;

  if(      (tr.sampleRate % 48000) == 0) {
    max   = settings.mpvSamplerateMax48;
    min   = settings.mpvSamplerateMin48;
    force = settings.mpvSamplerateForce48;
  }
  else if( (tr.sampleRate % 44100) == 0) {
    max   = settings.mpvSamplerateMax44;
    min   = settings.mpvSamplerateMin44;
    force = settings.mpvSamplerateForce44;
  }

  wantedRate = tr.sampleRate;

  if(force) {
    wantedRate = force;
  } else {
    if(min) {
      if(wantedRate < min) {
        wantedRate = min;
      }    
    }
    if(max) {
      if(wantedRate > max) {
        wantedRate = max;
      }    
    }
  }  

  if(!wantedRate || wantedRate == exports.sampleRate) {
    return false;
  }

  mpvPlayer.volume(0);
  changingSampleRate = true;
  exports.sampleRate = wantedRate;

  console.log("mpv setting sample rate", wantedRate, "for", tr.name);

  exec(`SoundVolumeView.exe /SetDefaultFormat "${settings.wait4AudioDevice}" ${settings.mpvBitsPerSample} ${wantedRate}`, {encoding: 'utf16'}, async function(err, stdout, stderr) {
    console.log("mpv setting sample rate wait", exports.sampleRate, stdout.toString(), err);
    await sleep(settings.mpvSamplerateWaitMS);
    console.log("mpv setting sample rate done", exports.sampleRate);
    mpvPlayer.command("af", ["set", "lavfi=[aresample=" + exports.sampleRate + ":osf=s32:resampler=soxr:precision=32]"]);
    //mpvPlayer.command("af", ["set", "lavfi=[aresample=" + exports.sampleRate + ":osf=s32:resampler=swr:filter_size=512]"]); 
    mpvPlayer.goToPosition (0);
    mpvPlayer.volume(exports.volume);
    changingSampleRate = false;
  });

  return true;
}

//---------------------------------------------------------------------------------------
exports.setVolume = function(vol) {
  if(mpvPlayer && !changingSampleRate) {
    mpvPlayer.volume(vol);
  }

  exports.volume = vol;
}

//---------------------------------------------------------------------------------------
exports.currentTrack = function(cb) {

  if(playIdx === null || playIdx < 0 || playIdx >= playlist.length) 
    return cb({"error":"no track"});

  let track = playlist[playIdx];
  track.idx = playIdx;
  track.count = playlist.length; 

  cb(structuredClone(track));
}

//---------------------------------------------------------------------------------------
exports.active = function() {
  return playlist.length > 0;
};

//---------------------------------------------------------------------------------------
exports.play = function() {
  console.log("mpv play");
  mpvPlayer.resume();
};

//---------------------------------------------------------------------------------------
exports.pause = function() {
  console.log("mpv pause");
  mpvPlayer.pause();
};

//---------------------------------------------------------------------------------------
async function fadeOut() {
/*  
  for(let v = 100; v >= 0; v-=5) {
    mpvPlayer.volume(exports.volume / 100 * v);
    await sleep(5);
  }
*/
  mpvPlayer.volume(0);
  await sleep(200);
}

//---------------------------------------------------------------------------------------
async function fadeIn() {
/*  
  for(let v = 0; v <= 100; v+=5) {
    mpvPlayer.volume(exports.volume / 100 * v);
    await sleep(5);
  }
*/
  mpvPlayer.volume(exports.volume);
}

//---------------------------------------------------------------------------------------
exports.backTrack = async function() {

  console.log("mpv backTrack");

  if(exports.position > 2) {
    this.setPlayerPosition(0);
    mpvPlayer.resume();
    mpvPlayer.volume(exports.volume);
    return;
  }

  if(playIdx === null || playIdx <= 0) {
    return;
  }

  if(this.active) {
    await fadeOut();
  }

  let sampleRateChanged = checkSampleRateOfDevice(playIdx - 1);

  mpvPlayer.prev();
  mpvPlayer.resume();

  if(!sampleRateChanged) {
    mpvPlayer.volume(exports.volume);
  }
}

//---------------------------------------------------------------------------------------
exports.nextTrack = async function() {
  console.log("mpv nextTrack");
  
  if(playIdx === null || playIdx < 0 || playIdx + 1 >= playlist.length) {
    return;
  }

  if(this.active) {
    await fadeOut();
  }

  let sampleRateChanged = checkSampleRateOfDevice(playIdx + 1);

  mpvPlayer.next();
  mpvPlayer.resume();

  if(!sampleRateChanged) {
    mpvPlayer.volume(exports.volume);
  }
}

//---------------------------------------------------------------------------------------
exports.setPlayerPosition = async function(seconds) {

  if(this.active) {
    await fadeOut();
  } else {
    mpvPlayer.volume(0);
  }

  mpvPlayer.goToPosition(seconds);
  exports.position = seconds;
  mpvPlayer.resume();

  if(seconds > 0) {
    await fadeIn();
  } else {
    mpvPlayer.volume(exports.volume);
  }
}

//---------------------------------------------------------------------------------------
exports.playAlbumFrom = async function(msg, cb) {

  if(this.active) {
    await fadeOut();
  }

  mpvPlayer.stop();
  mpvPlayer.volume(exports.volume);

  itunes.albumTracks(msg, async function(tracks){
    mpvPlayer.clearPlaylist();
    playlist = [];
    playIdx = 0;
    let discNumber;
    let found = false;

    for(let tr of tracks) {

      if(tr.id_low == msg.id_low && tr.id_high == msg.id_high) {
        found = true;
      }

      if(!found) {
        continue;
      }

      if(!tr.enabled) {
        continue;
      }

      if(discNumber === undefined) {
        discNumber = tr.discNumber
      } else if(discNumber !== tr.discNumber) {
        break;
      }

      playlist.push(tr);

      if(playlist.length == 1) {
        checkSampleRateOfDevice(0);
      }

      mpvPlayer.append(tr.location);
    }

    mpvPlayer.next();
    mpvPlayer.resume();
    cb();
  });
}

//---------------------------------------------------------------------------------------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]];   // swap elements
  }
}

//---------------------------------------------------------------------------------------
const LIMIT_FIRST_LOAD  = 300;

exports.playTrackInList = async function(msg, cb) {

  if(this.active) {
    await fadeOut();
  }

  mpvPlayer.stop();
  mpvPlayer.volume(exports.volume);

  msg.skip = 0;  
  msg.count = 999999999;  // all tracks

  if(msg.idx == -1) { // shuffle
    msg.count = LIMIT_FIRST_LOAD;  // load only first ... tracks
  }

  itunes.playlistTracks(msg, async function(tracks){

    console.log(`mpv playTrackInList msg.idx=${msg.idx} tracks=${tracks.length}`);

    mpvPlayer.clearPlaylist();
    playlist = [];
    playIdx = 0;

    if(msg.idx == -1) {

      if(tracks.length > LIMIT_FIRST_LOAD) {
        tracks.pop(); // "load more"
      }

      msg.idx = 0;
      shuffleArray(tracks);

      // start a track
      const tr =tracks.pop();
      playlist.push(tr);

      checkSampleRateOfDevice(0);
      mpvPlayer.append(tr.location);

      mpvPlayer.next();
      mpvPlayer.resume();
      cb();
  
      // load all other tracks
      msg.skip = LIMIT_FIRST_LOAD;
      msg.count = 999999999;
  
      let moreTracks = await new Promise(function(resolve) {
        setTimeout(function() {
          itunes.playlistTracks(msg, async function(tracks){
            console.log(`mpv playTrackInList 2nd tracks=${tracks.length}`);
            resolve(tracks);
          });
        }, 200);  // do it after the client has loaded the track info of current track
      });

      tracks.push(...moreTracks);
      shuffleArray(tracks);
    }

    for(let i = msg.idx; i < tracks.length; i++) {
      const tr = tracks[i];
      playlist.push(tr);

      if(playlist.length == 1) {
        checkSampleRateOfDevice(0);
      }

      mpvPlayer.append(tr.location);

      if(tr.kind == 3) {  // radio
        break;
      }
    }

    if(msg.skip == LIMIT_FIRST_LOAD) {
      return;
    }

    mpvPlayer.next();
    mpvPlayer.resume();
    cb();
  });
}

//---------------------------------------------------------------------------------------
exports.playTrack = function(msg, cb) {

  itunes.getTrack(msg, async function(tr){

    if(exports.state) {
      playlist.push(tr);
      mpvPlayer.append(tr.location);
      return;
    }
  
    mpvPlayer.stop();
    mpvPlayer.clearPlaylist();
    playlist = [];
    playIdx = 0;

    playlist.push(tr);
    checkSampleRateOfDevice(0);
    mpvPlayer.append(tr.location);

    mpvPlayer.next();
    mpvPlayer.resume();
    cb();
  });
}
