var	iTunesApp = WScript.CreateObject("iTunes.Application");

function findPlayList(Name)
	{
	var	sources = iTunesApp.Sources;
	var   num_sources = sources.Count;
	
	while(num_sources)
		{
		var source=sources.Item(num_sources);
		
		if(source.Kind==1) // 1=Library, 2=iPod, 3=CD, 4=MP3 CD, 5=Device, 6=Radio, 7=Shared Library
			{
			var playlists=source.Playlists;
			var num_playlists=playlists.Count;
	
			while (num_playlists != 0)
				{
				var	currPlaylist = playlists.Item(num_playlists);
			
				if(currPlaylist.Name!=Name)
					{
					num_playlists--;
					continue;
					}
	
				return(currPlaylist);
				}
			}
			
		num_sources--;
		}
		
	return(0);
	}

var mainLibrary = iTunesApp.LibraryPlaylist;

var	sources = iTunesApp.Sources;
var num_sources = sources.Count;

var vol = 100;
//vol = iTunesApp.SoundVolume;

for(var v=vol; v>=0; v-=20)
  iTunesApp.SoundVolume = v;

var idx = parseInt(WScript.Arguments.Item(2));
var sortOrder = parseInt(WScript.Arguments.Item(3));

iTunesApp.Stop();

iTunesApp.SoundVolume = vol;

while(num_sources) {
	var source=sources.Item(num_sources);
	
	if(source.Kind==1) // 1=Library, 2=iPod, 3=CD, 4=MP3 CD, 5=Device, 6=Radio, 7=Shared Library
	{
	  var pl = source.Playlists.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

    if(!pl) 
      break;
    
    if(idx == -1) {
      pl.Shuffle = true;
      pl.PlayFirstTrack();
      break;
    } else {
      pl.Shuffle = false;
    }
  
    var tmpl = findPlayList("zRemotePro");

    if(tmpl)
      tmpl.Delete();
      
    tmpl = iTunesApp.CreatePlaylist("zRemotePro");
    tmpl.Shuffle = false;

    var tracks = pl.Tracks;
          
    for(var i=idx+1; i<=tracks.Count; i++) {
    
      if(sortOrder)
        track = tracks.ItemByPlayOrder(tracks.Count-i+1);
      else
        track = tracks.ItemByPlayOrder(i);
    
      tmpl.AddTrack(track);

      if(i==idx+1) {
        tmpl.PlayFirstTrack();
      }
        
      if(tmpl.Tracks.Count == 128)
        break;
    }
    
    break;
	}
		
	num_sources--;
}

