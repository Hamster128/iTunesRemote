var	iTunesApp = WScript.CreateObject("iTunes.Application");

var mainLibrary = iTunesApp.LibraryPlaylist;
var otrack = mainLibrary.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

if(otrack) {
  otrack.Enabled = WScript.Arguments.Item(2) == "true";  
}
