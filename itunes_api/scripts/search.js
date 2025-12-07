var	iTunesApp = WScript.CreateObject("iTunes.Application");

function includeFile (filename) {
      var fso = new ActiveXObject ("Scripting.FileSystemObject");
      var fileStream = fso.openTextFile (filename);
      var fileData = fileStream.readAll();
      fileStream.Close();
      eval(fileData);
  }
  
  
includeFile("json2.js");
includeFile("utils.js");

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

  if((type == '2' || type == '3') && idx.hasOwnProperty(Value))
    continue;
  
  var entry = {
    "name":Value,
    "album":track.Album,
    "artist":track.Artist,
    "albumArtist":track.AlbumArtist,
    "composer":track.Composer,
    "id_low":iTunesApp.ITObjectPersistentIDLow(track),
    "id_high":iTunesApp.ITObjectPersistentIDHigh(track),
    "trackNumber":track.TrackNumber,
    "bitRate":track.BitRate,
    "duration":track.Duration,
    "rating":track.Rating,
    "enabled":track.Enabled,
    "albumRating": track.AlbumRating,
    "compilation":track.Compilation,
    "sampleRate":track.SampleRate,
    "comment":track.Comment,
    "kind":track.Kind,
    "year":track.Year,
    "playedCount":track.PlayedCount,
    "playedDate": (track.PlayedDate && track.PlayedDate.getFullYear() > 1900) ? dateToString(track.PlayedDate) : "",
    "trackCount":track.TrackCount,
    "discCount":track.DiscCount,
    "discNumber":track.DiscNumber
  };  
    
  if(track.ratingKind)	// auto rating
    entry.rating = 0;

  Elements.push(entry);
  idx[Value] = true;
}

Elements.sort(function(a, b) {

  var Value1, Value2;

  switch(type) {
    case '2': // artist
      if(a.albumArtist != '') Value1 = a.albumArtist;
      else                    Value1 = a.artist;   
      if(b.albumArtist != '') Value2 = b.albumArtist;
      else                    Value2 = b.artist;   
      break;
    
    case '3': // album
       Value1 =  a.year;    
       Value2 =  b.year;
       break;     

    case '4': // Composer
      Value1 =  a.album; 
      Value2 =  b.album; 
      break;

    case '5': // Song
      Value1 =  a.name;
      Value2 =  b.name;
      break;
  }

  if(Value1 > Value2)
    return(1);
    
  if(Value1 < Value2)
    return(-1);
    
  return(0);
});


WScript.echo(JSON.stringify(Elements));
