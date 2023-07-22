var	iTunesApp = WScript.CreateObject("iTunes.Application");

var track = iTunesApp.CurrentTrack;
var count = 0;

if(track) {
  var artworks = track.Artwork;
  
  if(artworks && artworks.Count) {
    count = artworks.Count;

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
      } catch(e) {
      }
  
    }
  }
}

WScript.echo('{"found":'+count+'}');
