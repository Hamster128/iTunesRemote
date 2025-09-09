itunes = {};

itunes.play = function () {
  socket.emit('play', {});
};

itunes.pause = function () {
  socket.emit('pause', {});
};

itunes.backTrack = function () {
  socket.emit('backTrack', {});
};

itunes.nextTrack = function () {
  socket.emit('nextTrack', {});
};

itunes.setPlayerPosition = function (pos) {
  socket.emit('setPlayerPosition', { "newPosition": pos });
};

itunes.setSoundVolume = function (vol) {
  socket.emit('setSoundVolume', { "newVolume": vol });
};

itunes.setRepeat = function (r) {
  socket.emit('setRepeat', { "repeat": r });
};

itunes.setShuffle = function (s) {
  socket.emit('setShuffle', { "shuffle": s });
};

itunes.setDSP = function (s) {
  socket.emit('eq_apo', { "enabled": s });
};

itunes.albumTracks = function (track, ref) {
  socket.emit('albumTracks', { "track": track, "ref": ref });
};

itunes.playQueueFrom = function (idx) {
  socket.emit('playQueueFrom', { "idx": idx });
};

itunes.playAlbumFrom = function (id_low, id_high) {
  socket.emit('playAlbumFrom', { "id_low": id_low, "id_high": id_high });
};

itunes.playLists = function () {
  socket.emit('playLists', {});
};

itunes.playlistTracks = function (id_low, id_high, skip, mode, sortOrder, context) {
  socket.emit('playlistTracks', { "id_low": id_low, "id_high": id_high, "skip": skip, "mode": mode, "sortOrder": sortOrder, "context": context });
};

itunes.playTrackInList = function (id_low, id_high, idx, sortOrder) {
  socket.emit('playTrackInList', { "id_low": id_low, "id_high": id_high, "idx": idx, "sortOrder": sortOrder });
};

itunes.playTrack = function (id_low, id_high) {
  socket.emit('playTrack', { "id_low": id_low, "id_high": id_high });
};

itunes.setRating = function (id_low, id_high, rating) {
  socket.emit('setRating', { "id_low": id_low, "id_high": id_high, "rating": rating });
};

itunes.setEnabled = function (id_low, id_high, enabled) {
  socket.emit('setEnabled', { "id_low": id_low, "id_high": id_high, "enabled": enabled });
};

itunes.tracksPlaylists = function (track) {
  socket.emit('tracksPlaylists', track);
};

itunes.removeTrackFromList = function (msg) {
  socket.emit('removeTrackFromList', msg);
};

itunes.renameList = function (msg) {
  socket.emit('renameList', msg);
};

itunes.removeList = function(msg) {
  socket.emit('removeList', msg);
};

itunes.addList = function (msg) {
  socket.emit('addList', msg);
};

itunes.addTrackToList = function (msg) {
  socket.emit('addTrackToList', msg);
};

itunes.moveTrackInList = function (msg) {
  socket.emit('moveTrackInList', msg);
};

// 2...Artist / Album Artist
// 3...Album
// 4...Composer
// 5...Name
itunes.search = function (type, val) {
  socket.emit('search', { type: type, val: val });
};

itunes.artistAlbums = function (id_low, id_high) {
  socket.emit('artistAlbums', { "id_low": id_low, "id_high": id_high });
};

itunes.settings = function (settings) {
  socket.emit('settings', settings);
};

