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

var vol = 100;
//vol = iTunesApp.SoundVolume;

for(var v=vol; v>=0; v-=20)
  iTunesApp.SoundVolume = v;

iTunesApp.Stop();

iTunesApp.SoundVolume = vol;

var pl = findPlayList(WScript.Arguments.Item(0));

if(pl)
  pl.PlayFirstTrack();
		
