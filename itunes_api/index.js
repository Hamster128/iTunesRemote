const exec = require('child_process').exec;
const iconv = require('iconv-lite');
const fs = require('fs');

var script_options = {
	cwd: 'itunes_api/scripts',
	encoding: 'utf16',
	maxBuffer: 1024 * 1024 * 10
};

var execCmd = 'cscript /Nologo /U //E:jscript ';
var queue = [],
	queueActive = false;
var whenQueueIsEmpty = undefined;

let executeScript = function(scriptName, cb) {

	// console.log('execute', scriptName);

	exec(execCmd + scriptName, script_options, function(err, stdout, stderr) {
		if (err) {
			console.log('script error', scriptName, err);
			cb(err, '', '');
			return;
		}

		// console.log('script done', scriptName, stdout.toString(), stderr.toString());
		cb(null, stdout, '');
	});
};

let executeScriptRes = function(scriptName, cb) {
	var r = Math.random() * (999999999 - 100000000) + 100000000;
	var tmpName = process.env.TEMP + '\\itunes' + r + '.txt';

	exec(execCmd + scriptName + ' >' + tmpName, script_options, function(err, stdout, stderr) {
		if (err) {
			cb(err, '', '');
			return;
		}

		// stdout doesn`t work, so we need to use temp file
		var so = fs.readFileSync(tmpName);
		fs.unlink(tmpName, function(err) {});
/*
		if(scriptName.substring(0, 15) != 'currentTrack.js' &&
			 scriptName.substring(0, 17) != 'getPlayerState.js')
			console.log(scriptName, iconv.decode(so, 'utf16'));
*/
		cb(null, so, '');
	});
};

let doNextInQueue = function() {
	if (!queue.length || queueActive) return;

	queueActive = true;

	var job = queue.shift();

	if (job.func == 'play') {
		executeScript('play.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.play error', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'stop') {
		executeScript('stop.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.stop error', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'pause') {
		executeScript('pause.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.pause error', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'nextTrack') {
		executeScript('nextTrack.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.nextTrack error', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'backTrack') {
		executeScript('backTrack.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.backTrack error', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'getPlayerState') {
		executeScriptRes('getPlayerState.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.getPlayerState error', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				var s = str.split(';');
				job.cb({
					state: parseInt(s[0]),
					position: parseInt(s[1]),
					volume: parseInt(s[2]),
					shuffle: parseInt(s[3]),
					repeat: parseInt(s[4])
				});
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'currentTrack') {
		executeScriptRes('currentTrack.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.currentTrack error', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				try {
					job.cb(JSON.parse(str));
				} catch (e) {
					console.log(
						'itunes.currentTrack error parsing stdout=[' + stdout + '] str=[' + str + '] stderr=[' + stderr + '] ' + e
					);
					job.cb(null);
				}
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'currentArtwork') {
		executeScriptRes('currentArtwork.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.currentArtwork error', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');

				try {
					job.cb(JSON.parse(str));
				} catch (e) {
					console.log('itunes.currentArtwork error parsing [' + str + ']',  e, stderr);
					job.cb({ found: 0 });
				}
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'idxInQueue') {
		executeScriptRes('idxInQueue.js ' + job.id_low + ' ' + job.id_high, function(err, stdout, stderr) {
			if (err) console.log('itunes.idxInQueue error', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				job.cb(JSON.parse(str));
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'getArtwork') {
		executeScriptRes('getArtwork.js ' + job.id_low + ' ' + job.id_high, function(err, stdout, stderr) {
			if (err) console.log('itunes.getArtwork error', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				job.cb(JSON.parse(str));
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'setPlayerPosition') {
		executeScript('setPlayerPosition.js ' + job.newPosition, function(err, stdout, stderr) {
			if (err) console.log('itunes.setPlayerPosition error', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'setSoundVolume') {
		executeScript('setSoundVolume.js ' + job.newVolume, function(err, stdout, stderr) {
			if (err) console.log('itunes.setSoundVolume error', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'setRepeat') {
		executeScript('setRepeat.js ' + job.r, function(err, stdout, stderr) {
			if (err) console.log('itunes.setRepeat error', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'setShuffle') {
		executeScript('setShuffle.js ' + job.s, function(err, stdout, stderr) {
			if (err) console.log('itunes.setShuffle error ', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'albumTracks') {
		executeScriptRes('albumTracks.js ' + job.track.id_low + ' ' + job.track.id_high, function(err, stdout, stderr) {
			if (err) console.log('itunes.albumTracks error ', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				try {
					job.cb(JSON.parse(str));
				} catch (e) {
					console.log('itunes.albumTracks error parsing [' + str + '] ',  e, stderr);
				}
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'playTrack') {
		executeScript('playTrack.js ' + job.id.id_low + ' ' + job.id.id_high, function(err, stdout, stderr) {
			if (err) console.log('itunes.playTrack error ', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'playAlbumFrom') {
		executeScript('playAlbumFrom.js ' + job.id.id_low + ' ' + job.id.id_high, function(err, stdout, stderr) {
			if (err) console.log('itunes.playAlbumFrom error ', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'playQueueFrom') {
		executeScript('playQueueFrom.js ' + job.idx, function(err, stdout, stderr) {
			if (err) console.log('itunes.playQueueFrom error ', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'playListByName') {
		executeScript('playListByName.js ' + job.name, function(err, stdout, stderr) {
			if (err) console.log('itunes.playListByName error ', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'playLists') {
		executeScriptRes('playLists.js', function(err, stdout, stderr) {
			if (err) console.log('itunes.playLists error ', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				try {
					job.cb(JSON.parse(str));
				} catch (e) {
					console.log('itunes.playLists error parsing [' + str + '] ',  e, stderr);
				}
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'tracksPlaylists') {
		executeScriptRes('tracksPlaylists.js ' + job.track.id_low + ' ' + job.track.id_high, function(err, stdout, stderr) {
			if (err) console.log('itunes.tracksPlaylists error ', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				try {
					job.cb(JSON.parse(str));
				} catch (e) {
					console.log('itunes.tracksPlaylists error parsing [' + str + '] ',  e, stderr);
				}
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'playlistTracks') {
		executeScriptRes(
			'playlistTracks.js ' +
				job.id.id_low +
				' ' +
				job.id.id_high +
				' ' +
				job.id.skip +
				' ' +
				job.id.mode +
				' ' +
				job.id.sortOrder,
			function(err, stdout, stderr) {
				if (err) console.log('itunes.playlistTracks error', err);

				if (job.cb) {
					var str = iconv.decode(stdout, 'utf16');
					try {
						job.cb(JSON.parse(str));
					} catch (e) {
						console.log('itunes.playlistTracks error parsing [' + str + ']', e, stderr);
					}
				}

				queueActive = false;
				doNextInQueue();
			}
		);
	} else if (job.func == 'search') {
		let script = 'search.js ' + job.type + ' "' + job.val + '" ';
		executeScriptRes(script, function(err, stdout, stderr) {
			if (err) console.log('itunes.search error ', script, err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				try {
					job.cb(JSON.parse(str));
				} catch (e) {
					console.log('itunes.search error parsing [' + str + ']', script, e, stderr);
				}
			}

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'playTrackInList') {
		executeScript(
			'playTrackInList.js ' + job.id.id_low + ' ' + job.id.id_high + ' ' + job.id.idx + ' ' + job.id.sortOrder,
			function(err, stdout, stderr) {
				if (err) console.log('itunes.playTrackInList error ', err);

				if (job.cb) job.cb();

				queueActive = false;
				doNextInQueue();
			}
		);
	} else if (job.func == 'setRating') {
		executeScript('setRating.js ' + job.r.id_low + ' ' + job.r.id_high + ' ' + job.r.rating, function(
			err,
			stdout,
			stderr
		) {
			if (err) console.log('itunes.setRating error ', err);

			if (job.cb) job.cb();

			queueActive = false;
			doNextInQueue();
		});
	} else if (job.func == 'removeTrackFromList') {
		executeScript(
			'removeTrackFromList.js ' +
				job.msg.track.id_low +
				' ' +
				job.msg.track.id_high +
				' ' +
				job.msg.id_low +
				' ' +
				job.msg.id_high,
			function(err, stdout, stderr) {
				if (err) console.log('itunes.removeTrackFromList error ', err);

				if (job.cb) job.cb();

				queueActive = false;
				doNextInQueue();
			}
		);
	} else if (job.func == 'addTrackToList') {
		executeScript(
			'addTrackToList.js ' +
				job.msg.track.id_low +
				' ' +
				job.msg.track.id_high +
				' ' +
				job.msg.id_low +
				' ' +
				job.msg.id_high,
			function(err, stdout, stderr) {
				if (err) console.log('itunes.addTrackToList error ', err);

				if (job.cb) job.cb();

				queueActive = false;
				doNextInQueue();
			}
		);
	} else if (job.func == 'artistAlbums') {
		executeScriptRes('artistAlbums.js ' + job.id.id_low + ' ' + job.id.id_high, function(err, stdout, stderr) {
			if (err) console.log('itunes.artistAlbums error ', err);

			if (job.cb) {
				var str = iconv.decode(stdout, 'utf16');
				try {
					job.cb(JSON.parse(str));
				} catch (e) {
					console.log('itunes.artistAlbums error parsing [' + str + '] ',  e, stderr);
				}
			}

			queueActive = false;
			doNextInQueue();
		});
	} else console.log('unknown command in queue ' + job.func);
};

exports.play = function(cb) {
	queue.push({ func: 'play', cb: cb });
	doNextInQueue();
};

exports.stop = function(cb) {
	queue.push({ func: 'stop', cb: cb });
	doNextInQueue();
};

exports.pause = function(cb) {
	queue.push({ func: 'pause', cb: cb });
	doNextInQueue();
};

exports.nextTrack = function(cb) {
	queue.push({ func: 'nextTrack', cb: cb });
	doNextInQueue();
};

exports.backTrack = function(cb) {
	queue.push({ func: 'backTrack', cb: cb });
	doNextInQueue();
};

exports.getPlayerState = function(cb) {
	queue.push({ func: 'getPlayerState', cb: cb });
	doNextInQueue();
};

exports.currentTrack = function(cb) {
	queue.push({ func: 'currentTrack', cb: cb });
	doNextInQueue();
};

exports.currentArtwork = function(cb) {
	queue.push({ func: 'currentArtwork', cb: cb });
	doNextInQueue();
};

exports.idxInQueue = async function(track) {
	return new Promise(function(resolve) {
		queue.push({ func: 'idxInQueue', id_low: track.id_low, id_high: track.id_high, cb: resolve });
		doNextInQueue();
	});
}

exports.getArtwork = function(id_low, id_high, cb) {
	queue.push({ func: 'getArtwork', cb: cb, id_low: id_low, id_high: id_high });
	doNextInQueue();
};

exports.setPlayerPosition = function(newPosition, cb) {
	queue.push({ func: 'setPlayerPosition', cb: cb, newPosition: newPosition });
	doNextInQueue();
};

exports.setSoundVolume = function(newVolume, cb) {
	queue.push({ func: 'setSoundVolume', cb: cb, newVolume: newVolume });
	doNextInQueue();
};

exports.setRepeat = function(r, cb) {
	queue.push({ func: 'setRepeat', cb: cb, r: r });
	doNextInQueue();
};

exports.setShuffle = function(s, cb) {
	queue.push({ func: 'setShuffle', cb: cb, s: s });
	doNextInQueue();
};

exports.albumTracks = function(track, cb) {
	queue.push({ func: 'albumTracks', cb: cb, track: track });
	doNextInQueue();
};

exports.playAlbumFrom = function(id, cb) {
	queue.push({ func: 'playAlbumFrom', cb: cb, id: id });
	doNextInQueue();
};

exports.playQueueFrom = function(idx, cb) {
	queue.push({ func: 'playQueueFrom', cb: cb, idx: idx });
	doNextInQueue();
};

exports.playLists = function(cb) {
	queue.push({ func: 'playLists', cb: cb });
	doNextInQueue();
};

exports.tracksPlaylists = function(track, cb) {
	queue.push({ func: 'tracksPlaylists', cb: cb, track: track });
	doNextInQueue();
};

exports.playlistTracks = function(id, cb) {
	queue.push({ func: 'playlistTracks', cb: cb, id: id });
	doNextInQueue();
};

exports.search = function(type, val, cb) {
	queue.push({ func: 'search', cb: cb, type: type, val: val });
	doNextInQueue();
};

exports.playTrackInList = function(id, cb) {
	queue.push({ func: 'playTrackInList', cb: cb, id: id });
	doNextInQueue();
};

exports.playTrack = function(id, cb) {
	queue.push({ func: 'playTrack', cb: cb, id: id });
	doNextInQueue();
};

exports.setRating = function(r, cb) {
	queue.push({ func: 'setRating', cb: cb, r: r });
	doNextInQueue();
};

exports.removeTrackFromList = function(msg, cb) {
	queue.push({ func: 'removeTrackFromList', cb: cb, msg: msg });
	doNextInQueue();
};

exports.addTrackToList = function(msg, cb) {
	queue.push({ func: 'addTrackToList', cb: cb, msg: msg });
	doNextInQueue();
};

exports.artistAlbums = function(id, cb) {
	queue.push({ func: 'artistAlbums', cb: cb, id: id });
	doNextInQueue();
};

exports.playListByName = function(name, cb) {
	queue.push({ func: 'playListByName', cb: cb, name: name });
	doNextInQueue();
};

exports.isActive = queueActive;

exports.whenQueueIsEmpty = whenQueueIsEmpty;
