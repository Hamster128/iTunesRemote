itunes = {};

itunes.play = function() {
    socket.emit('play', {});
  };
    
itunes.pause = function() {
    socket.emit('pause', {});
  };
    
itunes.backTrack = function() {
    socket.emit('backTrack', {});
  };
    
itunes.nextTrack = function() {
    socket.emit('nextTrack', {});
  };
    
itunes.setPlayerPosition = function(pos) {
    socket.emit('setPlayerPosition', {"newPosition":pos});
  };
    
itunes.setSoundVolume = function(vol) {
    socket.emit('setSoundVolume', {"newVolume":vol});
  };
  
itunes.setRepeat = function(r) {
    socket.emit('setRepeat', {"repeat":r});
  };

itunes.setShuffle = function(s) {
    socket.emit('setShuffle', {"shuffle":s});
  };

itunes.albumTracks = function(track, ref) {
    socket.emit('albumTracks', {"track":track, "ref":ref});
  };
  
itunes.playAlbumFrom = function(id_low, id_high) {
    socket.emit('playAlbumFrom', {"id_low":id_low, "id_high":id_high});
  };

itunes.playLists = function() {
    socket.emit('playLists', {});
  };

itunes.playlistTracks = function(id_low, id_high, skip, mode, sortOrder) {
    socket.emit('playlistTracks', {"id_low":id_low, "id_high":id_high, "skip":skip, "mode":mode, "sortOrder":sortOrder});
  };

itunes.playTrackInList = function(id_low, id_high, idx, sortOrder) {
    socket.emit('playTackInList', {"id_low":id_low, "id_high":id_high, "idx":idx, "sortOrder":sortOrder});
  };

itunes.setRating = function(id_low, id_high, rating) {
    socket.emit('setRating', {"id_low":id_low, "id_high":id_high, "rating":rating});
  };

itunes.tracksPlaylists = function(track) {
    socket.emit('tracksPlaylists', track);
  };

itunes.removeTrackFromList = function(msg) {
    socket.emit('removeTrackFromList', msg);
  };

itunes.addTrackToList = function(msg) {
    socket.emit('addTrackToList', msg);
  };
  
itunes.search = function(type, val) {
    socket.emit('search', {type:type, val:val});
  };
  
itunes.artistAlbums = function(id_low, id_high) {
    socket.emit('artistAlbums', {"id_low":id_low, "id_high":id_high});
  };
  
itunes.settings = function(settings) {
    socket.emit('settings', settings);
  };
  
