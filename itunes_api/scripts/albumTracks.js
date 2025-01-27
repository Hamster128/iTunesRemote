var	iTunesApp = WScript.CreateObject("iTunes.Application");

var mainLibrary = iTunesApp.LibraryPlaylist;
var otrack = mainLibrary.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

function includeFile (filename) {
      var fso = new ActiveXObject ("Scripting.FileSystemObject");
      var fileStream = fso.openTextFile (filename);
      var fileData = fileStream.readAll();
      fileStream.Close();
      eval(fileData);
  }
  
  
includeFile("json2.js");
includeFile("albumOfTrack.js");

if(otrack)
{
  var album = albumOfTrack(otrack);
  var list = [];

  for(var i=0; i< album.length; i++)
  {
    var track = album[i];

    var tr = {
      "name":track.Name,
      "album":track.Album,
      "artist":track.Artist,
      "albumArtist":track.AlbumArtist,
      "composer":track.Composer,
      "id_low":iTunesApp.ITObjectPersistentIDLow(track),
      "id_high":iTunesApp.ITObjectPersistentIDHigh(track),
      "trackNumber":track.TrackNumber,
      "compilation":track.Compilation,
      "bitRate":track.BitRate,
      "duration":track.Duration,
      "rating":track.Rating,
      "enabled":track.Enabled,
      "sampleRate":track.SampleRate,
      "comment":track.Comment,
      "kind":track.Kind,
      "year":track.Year
    };

    if(track.ratingKind)	// auto rating
      tr.rating = 0;

    list.push(tr);
  }

  WScript.echo(JSON.stringify(list));
}
else
{
  WScript.echo('[]');
}
