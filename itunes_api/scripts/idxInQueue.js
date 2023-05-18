var	iTunesApp = WScript.CreateObject("iTunes.Application");

function includeFile (filename) {
	var fso = new ActiveXObject ("Scripting.FileSystemObject");
	var fileStream = fso.openTextFile (filename);
	var fileData = fileStream.readAll();
	fileStream.Close();
	eval(fileData);
}


includeFile("json2.js");

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

var id_low = WScript.Arguments.Item(0);
var id_high = WScript.Arguments.Item(1);

var tmpl = findPlayList("zRemotePro");

if(!tmpl) {
	WScript.echo(JSON.stringify({}));
	exit(0);
}

var tracks = tmpl.Tracks;
	    	    
for(var i=1; i<=tracks.Count; i++) {

	var track = tracks.ItemByPlayOrder(i);

	if(iTunesApp.ITObjectPersistentIDLow(track) == id_low && iTunesApp.ITObjectPersistentIDHigh(track) == id_high) {
		WScript.echo(JSON.stringify({idx:i, count:tracks.Count}));
		exit(0);
	}
}

WScript.echo(JSON.stringify({}));
