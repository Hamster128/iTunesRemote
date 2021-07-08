var	iTunesApp = WScript.CreateObject("iTunes.Application");

var vol = 100;
//vol = iTunesApp.SoundVolume;

for(var v=vol; v>=0; v-=8)
  iTunesApp.SoundVolume = v;

iTunesApp.PlayerPosition = WScript.Arguments.Item(0);

for(var v=0; v<=vol; v+=2)
  iTunesApp.SoundVolume = v;

