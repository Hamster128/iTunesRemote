var	iTunesApp = WScript.CreateObject("iTunes.Application");

var state = iTunesApp.PlayerState;
var vol = iTunesApp.SoundVolume;
var list =iTunesApp.CurrentPlaylist;
var shuffle = 0;
var repeat = 0;
var pos = 0;

if(state)
  pos = iTunesApp.PlayerPosition;

if(list)
{
  shuffle = list.Shuffle ? 1 : 0;
  repeat = list.SongRepeat;
}

var idLow = 0;
var idHigh = 0;
var track = iTunesApp.CurrentTrack;

if(track) {
  idLow = iTunesApp.ITObjectPersistentIDLow(track);
  idHigh = iTunesApp.ITObjectPersistentIDHigh(track);
}

WScript.echo(state+';'+pos+';'+vol+';'+shuffle+';'+repeat+';'+idLow+';'+idHigh);

