var	iTunesApp = WScript.CreateObject("iTunes.Application");

var	sources = iTunesApp.Sources;
var num_sources = sources.Count;

while(num_sources) {
	var source=sources.Item(num_sources);
	
	if(source.Kind==1) // 1=Library, 2=iPod, 3=CD, 4=MP3 CD, 5=Device, 6=Radio, 7=Shared Library
	{
	  var pl = source.Playlists.ItemByPersistentID(WScript.Arguments.Item(3), WScript.Arguments.Item(2));

    if(!pl) 
     break;

    var track = pl.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));
    
    track.Delete();
    
    break;
	}
		
	num_sources--;
}

