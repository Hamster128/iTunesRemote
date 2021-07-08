function includeFile (filename) {
      var fso = new ActiveXObject ("Scripting.FileSystemObject");
      var fileStream = fso.openTextFile (filename);
      var fileData = fileStream.readAll();
      fileStream.Close();
      eval(fileData);
  }

includeFile("albumOfTrack.js");

var	iTunesApp = WScript.CreateObject("iTunes.Application");

var mainLibrary = iTunesApp.LibraryPlaylist;
var otrack = mainLibrary.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

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

if(otrack)
{
  var trackNr = otrack.TrackNumber;
  var discNr  = otrack.DiscNumber;
  
  var list = albumOfTrack(otrack);
                  
  var vol = 100;
//  vol = iTunesApp.SoundVolume;
  
  for(var v=vol; v>=0; v-=8)
    iTunesApp.SoundVolume = v;

  iTunesApp.Stop();

  var tmpl = findPlayList("zRemotePro");

  if(tmpl)
    tmpl.Delete();

  tmpl = iTunesApp.CreatePlaylist("zRemotePro");
    
  for(var i=0; i<list.length; i++)
    tmpl.AddTrack(list[i]);
  
  iTunesApp.SoundVolume = vol;
  tmpl.Shuffle = false;

  tmpl.PlayFirstTrack();
  
  if(trackNr > 1 || discNr > 1) {
    iTunesApp.Pause();
  
    for(var i=0; i<list.length; i++) {
      if(list[i].TrackNumber == trackNr &&
         list[i].DiscNumber  == discNr)
        break;
      
      iTunesApp.NextTrack();
    }  
    
    iTunesApp.Play();
  }
 
}

