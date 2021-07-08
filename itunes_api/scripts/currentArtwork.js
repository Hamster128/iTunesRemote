var	iTunesApp = WScript.CreateObject("iTunes.Application");

var found = false;
var track = iTunesApp.CurrentTrack;

if(track) {
  var artworks = track.Artwork;
  
  if(artworks && artworks.Count) {
    var artwork = artworks.Item(1);
    
    var parts = WScript.ScriptFullName.split('\\');
    var path = '';
    
    for(var i=0; i<parts.length-3; i++) {
      path += parts[i] + '\\';
    }
  
    path += 'public\\img\\current.png';

    try {
      artwork.SaveArtworkToFile(path);
      found = true;
    } catch(e) {
    }
    
  }
}

WScript.echo('{"found":'+found+'}');
