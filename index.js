var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var itunes = require('./itunes_api');
var os = require('os');
var fs = require('fs');
var path = require('path');
const execFile = require('child_process').execFile;
const exec = require('child_process').exec;
const devialet = require('./devialet');
const Con2log = require('./con2log');

Con2log.keepFilesDays = 7;

var state = {
  state:0,
  position:0,
  initialized:false
};

var track = {
  name:'',
  artist:'',
  album:''
};

var getArtworkQueue = [], artWorkBusy = false;
var getStateTimer = 0, connections = 0;
var devialetVol = -1;
var systemRequiredInterval = 0, systemRequiredOffTimer = 0;
var newPosSet = false;
var audioDeviceState = {"state":2, "mute":0, "source":""};
var audioDevicePresentTimer = 0;
var audioDeviceCheckInterval = 500;
var continueAfterMute = false;
var iTunesEnabled = true;
var lastTrack;

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

var settings;

try {
  settings = fs.readFileSync('settings.json', 'utf8');
} catch(e) {
  settings = '{"playlists": {}}';
}


settings = JSON.parse(settings);

function doNextArtworkQueue() {
  if(artWorkBusy)
    return;

  if(!getArtworkQueue.length)
    return;

  artWorkBusy = true;

  var q = getArtworkQueue.shift();

  var file = path.join(__dirname, 'public/thumbs/cover_'+q.key+'.png');

  var opts = {
    headers: {
      "Cache-Control": "public, max-age=8640000"
    }
  };

  if( fs.existsSync(file) ) {
    q.res.sendFile(file, opts);
    artWorkBusy = false;
    doNextArtworkQueue();
  } else {

    console.log('getArtwork '+q.id_high+' '+q.id_low);

    itunes.getArtwork(q.id_low, q.id_high, function(rsp) {
      if(!rsp.found)
        file = path.join(__dirname, 'public/img/no_cover.png');
      else
        file = path.join(__dirname, 'public/img/cover.png');
    
      var is = fs.createReadStream(file)
  
      file = path.join(__dirname, 'public/thumbs/cover_'+q.key+'.png');
          
      is.on('end', function() {
        execFile('ImageLibC.exe', ['downscale', '256', file], {}, function(err, stdout, stderr) {
          q.res.sendFile(file, opts, function(err) {
            artWorkBusy = false;
            doNextArtworkQueue();
          });
        });
      });
        
      var os = fs.createWriteStream(file);
  
      is.pipe(os);
    });
  }
}

app.get('/thumbs/cover~*', function(req, res){
  var parts = req.url.split('~');
  var kind = parts[7];

  if(kind == '3') {  // kind == radio
    var trackName = decodeURI(parts[3]);
    
    var file = path.join(__dirname, 'public/thumbs_radio/' + trackName + '.jpg');

    var opts = {
      headers: {
        "Cache-Control": "public, max-age=8640000"
      }
    };

    if( !fs.existsSync(file) )
      file = path.join(__dirname, 'public/img/no_radio_icon.jpg');

    res.sendFile(file, opts);
    return;    
  }
      
  var key = parts[3];    // album;
  
  if(parts[5] != 'true') // compilation
    key += parts[4];     // artist
    
  key += parts[6];       // trackCount
  
  key = key.replace(/[^\w\s]/gi, '')

  getArtworkQueue.push({"req":req, "res":res, "id_low":parts[1], "id_high":parts[2], "key":key});
  doNextArtworkQueue();
});

io.on('connection', function(socket) {
  connections ++;

  socket.on('disconnect', function() {
    connections --;
  });
  
  socket.on('play', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.play();
  });
  
  socket.on('pause', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.pause();
  });

  socket.on('backTrack', function(msg){
    if(!iTunesEnabled)
      return;
      
    clearTimeout(getStateTimer);
    getStateTimer = 0;
    itunes.backTrack(function(){
      getStateTimer = 1;
      getState();
    });
    
  });
  
  socket.on('nextTrack', function(msg){
    if(!iTunesEnabled)
      return;
      
    clearTimeout(getStateTimer);
    getStateTimer = 0;
    itunes.nextTrack(function(){
      getStateTimer = 1;
      getState();
    });
  });

  socket.on('setPlayerPosition', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.setPlayerPosition(msg.newPosition);
    state.position = msg.newPosition;
    newPosSet = true;
  });

  socket.on('setSoundVolume', function(msg){
    if(!iTunesEnabled)
      return;
      
    if(state.volumeDigits) {
      let db = (msg.newVolume - 80) / 2; // -40 - +10
      db = Math.floor(db * 2) / 2;  // round to 0.5
      devialet.vol(db);
  } else {
      itunes.setSoundVolume(msg.newVolume);
    }
  });

  socket.on('setRepeat', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.setRepeat(msg.repeat);
  });

  socket.on('setShuffle', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.setShuffle(msg.shuffle);
  });
  
  socket.on('albumTracks', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.albumTracks(msg.track, function(tracks){
      socket.emit('albumTracks', {"tracks":tracks, "ref":msg.ref});
    });
  });

  socket.on('playTrack', function(msg){
    if(!iTunesEnabled)
      return;
      
    clearTimeout(getStateTimer);
    getStateTimer = 0;
    itunes.playTrack(msg, function(){
      getStateTimer = 1;
      track.name = undefined;   // force sending track.queueInfo
      getState();
    });
  });
   
  socket.on('playQueueFrom', function(msg){
    if(!iTunesEnabled)
      return;
      
    clearTimeout(getStateTimer);
    getStateTimer = 0;
    itunes.playQueueFrom(msg.idx, function(){
      getStateTimer = 1;
      getState();
    });
  });

  socket.on('playAlbumFrom', function(msg){
    if(!iTunesEnabled)
      return;
      
    clearTimeout(getStateTimer);
    getStateTimer = 0;
    itunes.playAlbumFrom(msg, function(){
      getStateTimer = 1;
      getState();
    });
  });
  
  socket.on('playLists', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.playLists(function(lists){
      socket.emit('playLists', lists);
    });
  });
  
  socket.on('playlistTracks', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.playlistTracks(msg, function(tracks) {
      socket.emit('playlistTracks', {tracks: tracks, context: msg.context});
    });
  });
  
  socket.on('playTrackInList', function(msg){
    console.log("on playTrackInList", msg);

    if(!iTunesEnabled)
      return;
      
    clearTimeout(getStateTimer);
    getStateTimer = 0;
    itunes.playTrackInList(msg, function(){
      getStateTimer = 1;
      getState();
    });
  });
  
  socket.on('setRating', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.setRating(msg);
    track.rating = msg.rating;
  });
  
  socket.on('tracksPlaylists', function(track){
    if(!iTunesEnabled)
      return;
      
    itunes.tracksPlaylists(track, function(lists){
      socket.emit('tracksPlaylists', lists);
    });
  });
  
  socket.searchReqNr = 0;
  socket.on('search', function(msg){
    if(!iTunesEnabled)
      return;
      
    socket.searchReqNr ++;
    let searchReqNr = socket.searchReqNr;

    itunes.search(msg.type, msg.val, function(list) {

      if(searchReqNr != socket.searchReqNr) {
        return;
      }
      
      socket.emit('searchResult', {type:msg.type, list:list});
    });
  });
  
  socket.on('removeTrackFromList', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.removeTrackFromList(msg, function() {
      itunes.tracksPlaylists(msg.track, function(lists){
        io.sockets.emit('tracksPlaylists', lists);
      });
    });
  });
  
  socket.on('addTrackToList', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.addTrackToList(msg, function() {
      itunes.tracksPlaylists(msg.track, function(lists){
        io.sockets.emit('tracksPlaylists', lists);
      });
    });
  });
  
  socket.on('artistAlbums', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.artistAlbums(msg, function(albums){
      socket.emit('artistAlbums', albums);
    });
  });
    
  socket.on('settings', function(msg){
    settings = msg;
    fs.writeFileSync("settings.json", JSON.stringify(msg, null, 2));
  });

  socket.on('eq_apo', function(msg){

    console.log('eq_apo', msg);

    if(msg.enabled) {
      fs.copyFileSync("C:\\Program Files\\EqualizerAPO\\config\\on.txt", "C:\\Program Files\\EqualizerAPO\\config\\config.txt");
    } else {
      fs.copyFileSync("C:\\Program Files\\EqualizerAPO\\config\\off.txt", "C:\\Program Files\\EqualizerAPO\\config\\config.txt");
    }

    fs.writeFileSync("settings.json", JSON.stringify(msg, null, 2));
  });

  socket.on('log', function(msg){
    console.log('CLIENT:', msg);
  });
  
  socket.emit('settings', settings);
  socket.emit('state', state);
  socket.emit('track', track);  
  socket.emit('deviceState', audioDeviceState);
});


var port = 81;

http.on('error', function(e) {
  if(e.code == 'EADDRINUSE') {
    port++;
    http.listen(port);
  } else {
    console.log(JSON.stringify(e));
  }
});

var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}

http.on('listening', function() {
  console.log('Open the following address in the browser of your mobile device:');
  console.log('http://'+addresses[0]+(port==80?'':(':'+port)));
});


http.listen(port);

function setDevialetInfo() {
  state.volume = devialetVol * 2 + 80;  // -40 - +10
  
  if(state.volume < 0)
    state.volume = 0;

  if(state.volume > 100)
    state.volume = 100;
                
  state.volumeDigits = devialetVol.toString();
        
  if( state.volumeDigits.indexOf('.') == -1)
    state.volumeDigits += '.0';   
}

function systemRequired(bEnable) {

  if(bEnable) {

    if(systemRequiredOffTimer) {
      console.log('systemRequired off...canceled');
      clearTimeout(systemRequiredOffTimer);
      systemRequiredOffTimer = 0;
    }

    if(systemRequiredInterval) {
      return;
    }
      
    console.log('systemRequired on');
    callSystemRequired();
    systemRequiredInterval = setInterval(callSystemRequired, 59000);
  
  } else {

    if(!systemRequiredInterval) {
      return;
    }

    if(systemRequiredOffTimer) {
      return;
    }

    console.log('systemRequired off...');
    systemRequiredOffTimer = setTimeout(systemRequiredOff, 60000);
  }
}

function callSystemRequired() {
  execFile('SystemRequired.exe', [], {}, function(err, stdout, stderr) {
  });
}

function systemRequiredOff() {
  console.log('systemRequired off...done');
  clearInterval(systemRequiredInterval);
  systemRequiredInterval = 0;
  systemRequiredOffTimer = 0;
}

function getState() {
  if(!connections && state.initialized && !systemRequiredInterval) {
    if(getStateTimer)
      getStateTimer = setTimeout(getState, 500);
    return;
  }

  itunes.getPlayerState(function(rsp){
    
    if(state.state != rsp.state || state.position != rsp.position || newPosSet) {
      var oldPos = state.position;
      
      state = rsp;
      
      if(!state.state || newPosSet)
        state.position = oldPos;
        
       newPosSet = false;
    
      if(devialetVol != -1) 
        setDevialetInfo();
    
      io.sockets.emit('state', state);
    }

    if(!getStateTimer)
      return;

    if(!connections && state.initialized) {
      getStateTimer = setTimeout(getState, 500);
      return;
    }

    itunes.currentTrack(async function(rsp){

      if(!getStateTimer)
        return;
            
      state.initialized = true;
            
      if(rsp && (rsp.name != track.name || rsp.artist != track.artist || rsp.album != track.album)) {
        track = rsp;

        if(track.kind == 3) { // radio
          track.artworks = 1;

          var is = fs.createReadStream('public/thumbs_radio/' + track.name + '.jpg')
          
          is.on('end', function() {
            io.sockets.emit('track', track);
          });
            
          is.on('error', function(e) {
            console.log('public/thumbs_radio/' + track.name + '.jpg '+e);
            
            var is = fs.createReadStream('public/img/no_radio_icon.jpg')
            
            is.on('end', function() {
              io.sockets.emit('track', track);
            });
              
            is.on('error', function(e) {
              console.log('Can`t open public/img/no_radio_icon.jpg '+e);
            });
              
            var os = fs.createWriteStream('public/img/current1.png');

            os.on('error', function(e) {
              console.log('Can`t write public/img/current1.png '+e);
            });
                            
            is.pipe(os);
          });
            
          var os = fs.createWriteStream('public/img/current1.png');

          os.on('error', function(e) {
            console.log('Can`t write public/img/current1.png '+e);
          });
                          
          is.pipe(os);
        } else {

          if(!track.name) {

            // player stopped, check if there were some tracks added to the queue while playing
            if(lastTrack && lastTrack['queueInfo'] && lastTrack.queueInfo.idx < lastTrack.queueInfo.count) {
              itunes.playQueueFrom(lastTrack.queueInfo.idx + 1, function() {
                getStateTimer = 1;
                getState();
              });
              return;
            }
          } 

          lastTrack = track;

          track.queueInfo = await itunes.idxInQueue(track);

          itunes.currentArtwork(function(resp){
          
            if(!getStateTimer)
              return;
              
            if(!resp.found) {
              track.artworks = 1;

              var is = fs.createReadStream('public/img/no_cover.png')
              
              is.on('end', function() {
                io.sockets.emit('track', track);
              });
                
              is.on('error', function(e) {
                console.log('Can`t open public/img/no_cover.png '+e);
              });
                
              var os = fs.createWriteStream('public/img/current1.png');
  
              os.on('error', function(e) {
                console.log('Can`t write public/img/current1.png '+e);
              });
                              
              is.pipe(os);
            }
            else {
              track.artworks = resp.found;
              io.sockets.emit('track', track);
            }
          });
        }
        
      }
        
      if(getStateTimer)
        getStateTimer = setTimeout(getState, 500);
    });
            
  });
}

function checkAudioDevice() {
  
  // generate a list of all audio devices
  execFile('EndPointController.exe', [], {}, function(err, stdout, stderr) {
  
    var lines = stdout.split('\n');
    var found = -2;
    
    // check if configured audio device is in list
    for(var l = 0; l < lines.length; l ++) {
      var line = lines[l];
      var p1 = line.indexOf(':');
      
      if(p1 == -1)
        continue;
        
  		var p2 = line.indexOf('(');

  		if(p2 == -1)
	  		continue;

		  var device = line.substr(p1+2, p2-p1-3);
      
      if(device == settings.wait4AudioDevice) {
        found = l;
        break;
      }
    }
      
    // if devialetSource is configured, check if it is the actual selected input
    if(found > -1 && 'devialetSource' in settings && audioDeviceState.source != settings.devialetSource) {
      found = -1;
    }
      
    if(found > -1) { // Audio device is present

      systemRequired(true);

      if(audioDeviceState.state == 2) {
        setTimeout(checkAudioDevice, audioDeviceCheckInterval);
        return;
      }

      if(audioDeviceState.state <= 0) {
        console.log(settings.wait4AudioDevice+' starting...');

        clearTimeout(getStateTimer);
        getStateTimer = 0;
        iTunesEnabled = false;
            
        // close iTunes
        execFile('nircmdc.exe', ['win', 'close', 'class', 'iTunes'], {}, function(err, stdout, stderr) {});

        if(settings.killAlso)
          execFile('nircmdc.exe', ['killprocess', settings.killAlso], {}, function(err, stdout, stderr) {});

        state.state = 0;
        io.sockets.emit('state', state);
        
        track.name = 0;
        io.sockets.emit('track', track);
            
        audioDeviceState.state = 1;
        
        io.sockets.emit('deviceState', audioDeviceState);
        audioDevicePresentTimer = new Date() * 1.0;
      }
      
      // if wait4AudioDeviceSeconds is configured wait this seconds before accept the device
      if('wait4AudioDeviceSeconds' in settings && 
         new Date() *1.0 < audioDevicePresentTimer + settings.wait4AudioDeviceSeconds * 1000) {
        setTimeout(checkAudioDevice, audioDeviceCheckInterval);
        return;
      }

      console.log(settings.wait4AudioDevice+' set as active device...');
    
      // set configured audio device as windows default audio device
      execFile('EndPointController.exe', [found], {}, function(err, stdout, stderr) {
      
        // be sure iTunes is closed now
        execFile('nircmdc.exe', ['killprocess', 'iTunes.exe'], {}, function(err, stdout, stderr) {});
      
        setTimeout(function(){
          if(audioDeviceState.state < 1)
            return;
        
          console.log(settings.wait4AudioDevice+' starting iTunes...');
        
          exec('start /min "" "C:\\Program Files\\iTunes\\iTunes.exe"', {windowsHide: true}, function(err, stdout, stderr) {
          });

          if(settings.startAlso)
            exec('start /min "" "'+settings.startAlso+'"', {windowsHide: true}, function(err, stdout, stderr) {
            });

          setTimeout(function(){
            if(audioDeviceState.state < 1)
              return;

            console.log(settings.wait4AudioDevice+' ready');
                    
            state.initialized = false;
            getStateTimer = 1;
            getState();
            iTunesEnabled = true;
            
            audioDeviceState.state = 2;
            io.sockets.emit('deviceState', audioDeviceState);
            
            setTimeout(checkAudioDevice, audioDeviceCheckInterval);
          }, 3000);
        }, 500);
      });
    
    } else {  // audio Device is currently not present

      systemRequired(false);

      var newState = -1;
      lastTrack = null;
      
      if(found == -1)  // wrong source selected on audio device
        newState = 0;

      if(audioDeviceState.state == newState) {
        setTimeout(checkAudioDevice, audioDeviceCheckInterval);
        return;
      }
            
      if(newState == -1)
        console.log(settings.wait4AudioDevice+' off');
      else {
        console.log(settings.wait4AudioDevice+' switched to '+audioDeviceState.source);
        
        if('devialetOtherSourceDevice' in settings) {

          // check if configured audio device is in list
          for(var l = 0; l < lines.length; l ++) {
            var line = lines[l];
            var p1 = line.indexOf(':');
            
            if(p1 == -1)
              continue;
              
        		var p2 = line.indexOf('(');
      
        		if(p2 == -1)
      	  		continue;
      
      		  var device = line.substr(p1+2, p2-p1-3);
            
            if(device == settings.devialetOtherSourceDevice) {
              // set configured audio device as windows default audio device
              execFile('EndPointController.exe', [l], {}, function(err, stdout, stderr) {});
              break;
            }
          }
        }
      }

      if(state.state) {
        itunes.stop();
        state.state = 0;
      }

			// stop iTines state checks and communication
			clearTimeout(getStateTimer);
			getStateTimer = 0;
      iTunesEnabled = false;

			// close iTunes
			execFile('nircmdc.exe', ['win', 'close', 'class', 'iTunes'], {}, function(err, stdout, stderr) {});

      if(settings.killAlso)
        execFile('nircmdc.exe', ['killprocess', settings.killAlso], {}, function(err, stdout, stderr) {});

      continueAfterMute = false;
      audioDeviceState.state = newState;
      io.sockets.emit('deviceState', audioDeviceState);
      
      setTimeout(checkAudioDevice, audioDeviceCheckInterval);
    }
    
  });

}

if('wait4AudioDevice' in settings) 
  checkAudioDevice();
else {
	setTimeout(function() {
		exec('start /min "" "C:\\Program Files\\iTunes\\iTunes.exe"', {windowsHide: true}, function(err, stdout, stderr) {
			getStateTimer = 1;
			getState();
		});
	}, 5000);	
}


devialet.start();

devialet.on("status", function(status){

  if(status.vol != devialetVol) {
    console.log('new devialet vol', devialetVol, status.vol);
    devialetVol = status.vol;
    setDevialetInfo();
    io.sockets.emit('state', state);
  }
  
  checkComputerWasSleeping();
  
  if(status.mute != audioDeviceState.mute && audioDeviceState.state == 2) {
  
    if(status.mute && state.state) {
      itunes.pause();
      continueAfterMute = true;
    }
    
    if(!status.mute && continueAfterMute) {
      itunes.play();
      continueAfterMute = false;
    }
  }
  
  if(status.source != audioDeviceState.source || status.mute != audioDeviceState.mute) {
    audioDeviceState.source = status.source;
    audioDeviceState.mute   = status.mute;
    io.sockets.emit('deviceState', audioDeviceState);
  }
});

// check if computer was in sleep mode
var lastCheckSleepTime = (new Date()).getTime();

function checkComputerWasSleeping() {
  var currentTime = (new Date()).getTime();
  
  if (currentTime > (lastCheckSleepTime + 600)) {
    console.log('Computer just woke up');
    continueAfterMute = false;
  }
}

setInterval(function() {
  checkComputerWasSleeping();
  
  var currentTime = (new Date()).getTime();
  lastCheckSleepTime = currentTime;
}, 500);

