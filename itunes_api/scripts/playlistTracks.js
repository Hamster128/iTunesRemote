var	iTunesApp = WScript.CreateObject("iTunes.Application");

function includeFile (filename) {
      var fso = new ActiveXObject ("Scripting.FileSystemObject");
      var fileStream = fso.openTextFile (filename);
      var fileData = fileStream.readAll();
      fileStream.Close();
      eval(fileData);
  }
  
  
includeFile("json2.js");

var	sources = iTunesApp.Sources;
var num_sources = sources.Count;
var skip = parseInt(WScript.Arguments.Item(2));
var mode = parseInt(WScript.Arguments.Item(3));
var sortOrder = parseInt(WScript.Arguments.Item(4));
var idx = {};
var count = 50;

if(skip < 0) {
  count = skip * -1;
  skip = 0;
}

while(num_sources) {
  var source=sources.Item(num_sources);
  
  if(source.Kind==1) // 1=Library, 2=iPod, 3=CD, 4=MP3 CD, 5=Device, 6=Radio, 7=Shared Library
  {
    var pl = source.Playlists.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

    if(pl) {
      var tracks = pl.Tracks;
      var list = [];
      
      for(var i=1; i<= tracks.Count; i++) {

        if(mode) {  // list of albums
          var track;
          
          if(sortOrder)
            track = tracks.ItemByPlayOrder(tracks.Count-i+1);
           else
            track = tracks.ItemByPlayOrder(i);
            
          if(idx.hasOwnProperty(track.Album))
            continue;

          idx[track.Album] = true;
            
          if(skip) {
            skip--;
            continue;
          }

          if(list.length == count) {
            list.push({
              "name":"load more",
              "toBeContinued":true
              });
            break;
          }

          var Value;
          
          if(track.AlbumArtist != '') Value = track.AlbumArtist;
          else                        Value = track.Artist;   

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
            
          list.push(entry);

        } else {    // list of tracks
          if(skip) {
            skip--;
            continue;
          }
        
          if(list.length == count) {
            list.push({
              "name":"load more",
              "toBeContinued":true
              });
            break;
          }
  
          var track;
          
          if(sortOrder)
            track = tracks.ItemByPlayOrder(tracks.Count-i+1);
          else
            track = tracks.ItemByPlayOrder(i);
        
          var tr = {
            "name":track.Name,
            "album":track.Album,
            "artist":track.Artist,
            "id_low":iTunesApp.ITObjectPersistentIDLow(track),
            "id_high":iTunesApp.ITObjectPersistentIDHigh(track),
            "trackNumber":track.TrackNumber,
            "trackCount":track.TrackCount,
            "compilation":track.Compilation,
            "bitRate":track.BitRate,
            "duration":track.Duration,
            "rating":track.Rating,
            "sampleRate":track.SampleRate,
            "comment":track.Comment,
            "kind":track.Kind,
            "year":track.Year,
            "i":i
          };
      
          list.push(tr);
        }
      }
    
      WScript.echo(JSON.stringify(list, null, 2));
	  }
    else
      WScript.echo('[]');
      
    break;
	}
		
	num_sources--;
}

