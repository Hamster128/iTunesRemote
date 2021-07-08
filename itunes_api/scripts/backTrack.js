var	iTunesApp = WScript.CreateObject("iTunes.Application");

var vol = iTunesApp.SoundVolume;

for(var v=vol; v>=0; v-=8)
  iTunesApp.SoundVolume = v;

iTunesApp.BackTrack();

iTunesApp.SoundVolume = vol;
