var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var itunes = require('./itunes_api');
var myip = require('quick-local-ip');
var fs = require('fs');
var path = require('path');
const execFile = require('child_process').execFile;
const exec = require('child_process').exec;
const dgram = require('dgram');
const server = dgram.createSocket('udp4');


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

io.on('connection', function(socket){
  connections ++;

  socket.on('disconnect', function(){
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
      
    itunes.setSoundVolume(msg.newVolume);
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
      
    itunes.playlistTracks(msg, function(tracks){
      socket.emit('playlistTracks', tracks);
    });
  });
  
  socket.on('playTackInList', function(msg){
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
  
  socket.on('search', function(msg){
    if(!iTunesEnabled)
      return;
      
    itunes.search(msg.type, msg.val, function(list){
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
    fs.writeFile("settings.json", JSON.stringify(msg, null, 2), function(err) {
      if(err)
        console.log(err);
    });       
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

http.on('listening', function() {
  console.log('Open the following address in the browser of your mobile device:');
  console.log('http://'+myip.getLocalIP4()+(port==80?'':(':'+port)));
});


http.listen(port);

function setDevialetInfo() {
  state.volume = devialetVol / 0.3 + 100;  // -30 - +0
  
  if(state.volume < 0)
    state.volume = 0;

  if(state.volume > 100)
    state.volume = 100;
                
  state.volumeDigits = devialetVol.toString();
        
  if( state.volumeDigits.indexOf('.') == -1)
    state.volumeDigits += '.0';   
}

function systemRequired() {
//  console.log('SystemRequired');
  execFile('SystemRequired.exe', [], {}, function(err, stdout, stderr) {
//    console.log('SystemRequired '+err+' '+stdout);
  });
}

function systemRequiredOff() {
	console.log('systemRequired off');
  clearInterval(systemRequiredInterval);
  systemRequiredInterval = 0;
  systemRequiredOffTimer = 0;
//  console.log('systemRequiredOff');
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
      
      if(state.state && !systemRequiredInterval) {
        if(systemRequiredOffTimer) {
          clearTimeout(systemRequiredOffTimer);
          systemRequiredOffTimer = 0;
        }
          
				console.log('Playing -> systemRequired on');
        systemRequired();
        systemRequiredInterval = setInterval(systemRequired, 59000);
      }
       
      if(!state.state && systemRequiredInterval && !systemRequiredOffTimer) {
				console.log('Stopped -> systemRequired off...');
        systemRequiredOffTimer = setTimeout(systemRequiredOff, 300000);
      }
      
      
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

    itunes.currentTrack(function(rsp){

      if(!getStateTimer)
        return;
            
      state.initialized = true;
            
      if(rsp && (rsp.name != track.name || rsp.artist != track.artist || rsp.album != track.album)) {
        track = rsp;

        if(track.kind == 3) { // radio
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
              
            var os = fs.createWriteStream('public/img/current.png');

            os.on('error', function(e) {
              console.log('Can`t write public/img/current.png '+e);
            });
                            
            is.pipe(os);
          });
            
          var os = fs.createWriteStream('public/img/current.png');

          os.on('error', function(e) {
            console.log('Can`t write public/img/current.png '+e);
          });
                          
          is.pipe(os);
        } else {
          itunes.currentArtwork(function(resp){
          
            if(!getStateTimer)
              return;
              
            if(!resp.found) {
              var is = fs.createReadStream('public/img/no_cover.png')
              
              is.on('end', function() {
                io.sockets.emit('track', track);
              });
                
              is.on('error', function(e) {
                console.log('Can`t open public/img/no_cover.png '+e);
              });
                
              var os = fs.createWriteStream('public/img/current.png');
  
              os.on('error', function(e) {
                console.log('Can`t write public/img/current.png '+e);
              });
                              
              is.pipe(os);
            }
            else
              io.sockets.emit('track', track);
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
      var newState = -1;
      
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
      systemRequiredOff();

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

server.on('error', function(err) {
  console.log('udb server error:\n'+err.stack);
  server.close();
});

server.on('message', function(msg, rinfo) {

//  fs.writeFile('devialet_msg.txt', msg, function(err){});

  var vol = 0;
  var source = 'OFF';
  
  var b308 = msg.readUInt8(308);
  
  var sourceNr = (b308 >> 4) & 0x07;
  var mute     = (b308 >> 1) & 0x01;
    
  var sn = 0;
        
  for(var s = 0; s < 15; s++) {
    var enabled = msg.toString('utf-8', 52 + s * 17, 53 + s * 17);
    
    if(enabled == '1') {
      sn++;
      
      if(sn < sourceNr) 
        continue;
        
      var e = 53 + s * 17;
      
      for(; e < 53 + s * 17 + 16; e++) 
      {
        var chr = msg.readUInt8(e);
        
        if(chr == 0)
          break;
      }
  
      source = msg.toString('utf-8', 53 + s * 17, e);
      break;
    }
  }

  vol = msg.readUInt8(310);
  vol = (vol - 195) / 2; // -97.5 - +30 dB  (127.5)
  
  if(vol != devialetVol) {
    devialetVol = vol;
    setDevialetInfo();
    io.sockets.emit('state', state);
  }
  
  checkComputerWasSleeping();
  
  if(mute != audioDeviceState.mute && audioDeviceState.state == 2) {
  
    if(mute && state.state) {
      itunes.pause();
      continueAfterMute = true;
    }
    
    if(!mute && continueAfterMute) {
      itunes.play();
      continueAfterMute = false;
    }
  }
  
  if(source != audioDeviceState.source || mute != audioDeviceState.mute) {
    audioDeviceState.source = source;
    audioDeviceState.mute   = mute;
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

// start udp server
server.on('listening', function() {
  var address = server.address();
});

server.bind(45454); // UDB port of Devialet
