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

var type = WScript.Arguments.Item(0);
var searchFor = WScript.Arguments.Item(1).toLowerCase();

var tracks = iTunesApp.LibraryPlaylist.Search(searchFor, type);

var Elements = [];
var idx = {};

for(var i = 1; i <= tracks.Count; i++) {
  var Value;
  var track = tracks.Item(i);

//  WScript.echo('track.Artist='+track.Artist+' track.AlbumArtist='+track.AlbumArtist);
      
  switch(type) {
    case '2': 
      if(track.AlbumArtist != '') Value = track.AlbumArtist;
      else                        Value = track.Artist;   
      break;
    
    case '3': Value =  track.Album;    break;      
    case '4': Value =  track.Composer; break;
    case '5': Value =  track.Name;     break;
  }
  
  if(Value.toLowerCase().indexOf(searchFor) == -1)
    continue;
  
  if(idx.hasOwnProperty(Value))
    continue;
  
  var entry = {
    "name":Value,
    "id_low":iTunesApp.ITObjectPersistentIDLow(track),
    "id_high":iTunesApp.ITObjectPersistentIDHigh(track)
  };  
    
  Elements.push(entry);
  idx[Value] = true;
}

WScript.echo(JSON.stringify(Elements));
