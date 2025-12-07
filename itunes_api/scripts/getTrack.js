var	iTunesApp = WScript.CreateObject("iTunes.Application");
var mainLibrary = iTunesApp.LibraryPlaylist;

function includeFile (filename) {
	var fso = new ActiveXObject ("Scripting.FileSystemObject");
	var fileStream = fso.openTextFile (filename);
	var fileData = fileStream.readAll();
	fileStream.Close();
	eval(fileData);
}

includeFile("json2.js");
includeFile("utils.js");

var track = mainLibrary.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

if(!track) {
	WScript.echo('{"error":"track not found"}');
	WScript.Quit(0);
}

var tr = {
	"name":track.Name,
	"album":track.Album,
	"artist":track.Artist,
	"albumArtist":track.AlbumArtist,
	"composer":track.Composer,
	"id_low":iTunesApp.ITObjectPersistentIDLow(track),
	"id_high":iTunesApp.ITObjectPersistentIDHigh(track),
	"trackNumber":track.TrackNumber,
	"trackCount":track.TrackCount,
	"compilation":track.Compilation,
	"kind":track.Kind,
	"bitRate":track.BitRate,
	"duration":track.Duration,
	"rating":track.Rating,
	"enabled":track.Enabled,
	"sampleRate":track.SampleRate,
	"type":track.KindAsString,
	"comment":track.Comment,
	"year":track.Year,
	"playedCount":track.PlayedCount,
	"playedDate": (track.PlayedDate && track.PlayedDate.getFullYear() > 1900) ? dateToString(track.PlayedDate) : "",
	"grouping":track.Grouping,
	"volumeAdjustment": track.VolumeAdjustment
};

if(track.Kind == 3) tr.location = track.URL;
else                tr.location = track.Location;


WScript.echo(JSON.stringify(tr, null, 2));