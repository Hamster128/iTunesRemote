var	iTunesApp = WScript.CreateObject("iTunes.Application");

var list =iTunesApp.CurrentPlaylist;


if(list)
{
  var par = WScript.Arguments.Item(0);
  
  if(par=='1')
    list.Shuffle = true;
  else
    list.Shuffle = false;
}
