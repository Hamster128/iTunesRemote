var	iTunesApp = WScript.CreateObject("iTunes.Application");
var mainLibrary = iTunesApp.LibraryPlaylist;

var	sources = iTunesApp.Sources;
var num_sources = sources.Count;

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


while(num_sources) {
	var source=sources.Item(num_sources);
	
	if(source.Kind==1) { // 1=Library, 2=iPod, 3=CD, 4=MP3 CD, 5=Device, 6=Radio, 7=Shared Library

    var tmpl = findPlayList("zRemotePro");

    if(!iTunesApp.PlayerState && tmpl) {
      tmpl.Delete();
			tmpl = null;
		}

		var track = mainLibrary.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

		if(!tmpl) {
			tmpl = iTunesApp.CreatePlaylist("zRemotePro");
			tmpl.Shuffle = false;
		}

		// WScript.echo('playTrack ' + track.Name + ' state='+iTunesApp.PlayerState);

		tmpl.AddTrack(track);

		if(!iTunesApp.PlayerState) {
			tmpl.PlayFirstTrack();
		}
      
		break;
	}
		
	num_sources--;
}

