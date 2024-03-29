
albumOfTrack = function(strack) {
  var tracks = iTunesApp.LibraryPlaylist.Search(strack.Album, 3);

  var list = [];
  
  var sArtist = strack.AlbumArtist;
  
  if(sArtist == '')
    sArtist = strack.Artist;
  
  for(var i=1; i<= tracks.Count; i++)
  {
    var track = tracks.Item(i);
    
    if(track.Album != strack.Album)
      continue;

//    if(track.TrackCount != strack.TrackCount)
//      continue;

    if(!track.Compilation) {
      var Artist = track.AlbumArtist;
      
      if(Artist == '')
        Artist = track.Artist;
        
      if(Artist != sArtist)
        continue;
    }
        
    list.push(track);
  }

  list.sort(function(a, b) {
    if(a.DiscNumber > b.DiscNumber)
      return(1);
      
    if(a.DiscNumber < b.DiscNumber)
      return(-1);
      
    if(a.TrackNumber > b.TrackNumber)
      return(1);
      
    if(a.TrackNumber < b.TrackNumber)
      return(-1);
      
    return(0);
  });
  
  return(list);
}
