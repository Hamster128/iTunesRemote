var	iTunesApp = WScript.CreateObject("iTunes.Application");

var	sources = iTunesApp.Sources;
var num_sources = sources.Count;

var from  = parseInt(WScript.Arguments.Item(2));
var to    = parseInt(WScript.Arguments.Item(3));
var order = parseInt(WScript.Arguments.Item(4));

while(num_sources) {
	var source=sources.Item(num_sources);
	
	if(source.Kind==1) // 1=Library, 2=iPod, 3=CD, 4=MP3 CD, 5=Device, 6=Radio, 7=Shared Library
	{
	  var pl = source.Playlists.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

    if(!pl) {
      WScript.echo("playlist not found!");
      break;
    }
  
    if(order) {
      from = pl.Tracks.Count - from - 1;
      to   = pl.Tracks.Count - to;
    }

    if(to >= from)
      to -= 1;

    // remove from old position
    var otrack = pl.Tracks.ItemByPlayOrder(from + 1);

    var id_low = iTunesApp.ITObjectPersistentIDLow(otrack);
    var id_high = iTunesApp.ITObjectPersistentIDHigh(otrack);

    otrack.Delete();
    pl = source.Playlists.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));
  
    // remove following tracks from list
    var scrap = [];
      
    for(var i = pl.Tracks.Count; i > to ; i--) {

      // sometimes pl is lost
      pl = source.Playlists.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

      var tr = pl.Tracks.ItemByPlayOrder(i);

      scrap.push({
        id_low:  iTunesApp.ITObjectPersistentIDLow(tr),
        id_high: iTunesApp.ITObjectPersistentIDHigh(tr)
      });

      tr.Delete();
    }

    // add track
    otrack = iTunesApp.LibraryPlaylist.Tracks.ItemByPersistentID(id_high, id_low);

    if(!otrack) {
      WScript.echo("Can not find original track " + id_low + " " + id_high);
      break;
    }

    pl.AddTrack(otrack);

    // add removed tracks again
    while(scrap.length) {
      var info = scrap.pop();

      otrack = iTunesApp.LibraryPlaylist.Tracks.ItemByPersistentID(info.id_high, info.id_low);

      if(otrack) {
        pl.AddTrack(otrack);
      } else {
        WScript.echo("Can not find scrap track " + scrap.length + " " + info.id_low + " " + info.id_high);
      }
    }

    WScript.echo("count " + pl.Tracks.Count);

    break;
	}
		
	num_sources--;
}

