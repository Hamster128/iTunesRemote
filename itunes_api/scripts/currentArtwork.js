var	iTunesApp = WScript.CreateObject("iTunes.Application");

var found = false;
var track = iTunesApp.CurrentTrack;

if(track) {
  var artworks = track.Artwork;
  
  if(artworks && artworks.Count) {


    for(var a = 1; a <= artworks.Count; a++) {

      var artwork = artworks.Item(a);
    
      var parts = WScript.ScriptFullName.split('\\');
      var path = '';
      
      for(var i=0; i<parts.length-3; i++) {
        path += parts[i] + '\\';
      }
    
      path += 'public\\img\\current' + a + '.png';
  
      try {
        artwork.SaveArtworkToFile(path);
        found = true;
      } catch(e) {
      }
  
    }
  }
}

WScript.echo('{"found":'+artworks.Count+'}');
