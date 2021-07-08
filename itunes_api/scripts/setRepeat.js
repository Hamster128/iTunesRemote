var	iTunesApp = WScript.CreateObject("iTunes.Application");

var list =iTunesApp.CurrentPlaylist;

if(list)
  list.SongRepeat = WScript.Arguments.Item(0);


