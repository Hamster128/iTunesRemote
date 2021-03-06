var	iTunesApp = WScript.CreateObject("iTunes.Application");

var mainLibrary = iTunesApp.LibraryPlaylist;
var otrack = mainLibrary.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

function includeFile (filename) {
      var fso = new ActiveXObject ("Scripting.FileSystemObject");
      var fileStream = fso.openTextFile (filename);
      var fileData = fileStream.readAll();
      fileStream.Close();
      eval(fileData);
  }
  
  
includeFile("json2.js");

var	sources = iTunesApp.Sources;
var num_sources = sources.Count;
var lists=[];
var tracksLists = null;

if(otrack) {
  var tracksLists = otrack.Playlists;
}


while(num_sources) {
	var source=sources.Item(num_sources);
	
	if(source.Kind==1) // 1=Library, 2=iPod, 3=CD, 4=MP3 CD, 5=Device, 6=Radio, 7=Shared Library
	{
		var playlists=source.Playlists;
		var num_playlists=playlists.Count;

		while (num_playlists != 0){
			var	pl = playlists.Item(num_playlists);

      if(pl.Kind != 2 || pl.SpecialKind!=0 || pl.Smart) {  // 9..books, 7...movies, 8..tv shows, 10..iTunes U
        num_playlists--;      
        continue;
      }

      var plj = {
        "name": pl.Name,
        "kind": pl.Kind,
        "id_low": iTunesApp.ITObjectPersistentIDLow(pl),
        "id_high": iTunesApp.ITObjectPersistentIDHigh(pl),
        "duration": pl.Duration,
        "smart": pl.Smart,
        "specialKind": pl.SpecialKind,
        "size": pl.Size,
        "count": pl.Tracks.Count
      };

		  if(tracksLists) {
    		var num_tracksPlaylists = tracksLists.Count;
    		
    		for(p=1; p <= num_tracksPlaylists; p++) {
    		  var	tpl = tracksLists.Item(p);
    		  
    		  if(tpl.Name == pl.Name) {
    		    plj.included = true;
    		    break;;
    		  }
    		}
		    
		  }
		  				  				  		
		  lists.push(plj);
		  
		  num_playlists--;
	  }
	}
		
	num_sources--;
}


lists.sort(function(a, b) {

  if(a.specialKind < b.specialKind)
    return(1);

  if(a.specialKind > b.specialKind)
    return(-1);

  if(a.smart < b.smart)
    return(1);

  if(a.smart > b.smart)
    return(-1);

  if(a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase())
    return(1);
    
  if(a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase())
    return(-1);
    
  return(0);
});

WScript.echo(JSON.stringify(lists));

