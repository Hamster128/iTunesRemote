var	iTunesApp = WScript.CreateObject("iTunes.Application");

function includeFile (filename) {
      var fso = new ActiveXObject ("Scripting.FileSystemObject");
      var fileStream = fso.openTextFile (filename);
      var fileData = fileStream.readAll();
      fileStream.Close();
      eval(fileData);
  }
  
  
includeFile("json2.js");

/*
(0) Search all fields of each track.
(1) Search only the fields with columns that are currently visible in the display for the playlist. 
    Note that song name, artist, album, and composer will always be searched, even if these columns are not visible.
(2) Search only the artist field of each track (IITTrack::Artist).
(3) Search only the album field of each track (IITTrack::Album).
(4) Search only the composer field of each track (IITTrack::Composer).
(5) Search only the song name field of each track (IITTrack::Name).
*/

var track = iTunesApp.LibraryPlaylist.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));
var searchFor = '';

if(track.AlbumArtist != '') searchFor = track.AlbumArtist.toLowerCase();
else                        searchFor = track.Artist.toLowerCase();

var tracks = iTunesApp.LibraryPlaylist.Search(searchFor, 2);

var Elements = [];
var idx = {};

for(var i = 1; i <= tracks.Count; i++) {
  var track = tracks.Item(i);
  var Value;
  
  if(track.AlbumArtist != '') Value = track.AlbumArtist;
  else                        Value = track.Artist;   
    
  if(Value.toLowerCase() != searchFor)
    continue;
  
  if(idx.hasOwnProperty(track.Album))
    continue;
  
  var entry = {
    "name":track.Album,
    "artist":Value,
    "id_low":iTunesApp.ITObjectPersistentIDLow(track),
    "id_high":iTunesApp.ITObjectPersistentIDHigh(track),
    "rating":track.AlbumRating,
    "compilation":track.Compilation,
    "year":track.Year,
    "trackCount":track.TrackCount,
    "discCount":track.DiscCount,
    "discNumber":track.DiscNumber
  };  
    
  Elements.push(entry);
  idx[track.Album] = true;
}

Elements.sort(function(a, b) {
  if(a.year > b.year)
    return(1);
    
  if(a.year < b.year)
    return(-1);
    
  return(0);
});

WScript.echo(JSON.stringify(Elements));
