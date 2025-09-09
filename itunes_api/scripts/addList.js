var	iTunesApp = WScript.CreateObject("iTunes.Application");

var mainLibrary = iTunesApp.LibraryPlaylist;

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

var newName = WScript.Arguments.Item(0);
var list = findPlayList(newName);

if(list) {
  WScript.echo('{"error": "list does already exist!"}');
  WScript.Quit(0);
}

iTunesApp.CreatePlaylist(newName);
WScript.echo('{}');
