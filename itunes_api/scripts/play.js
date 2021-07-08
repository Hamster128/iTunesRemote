var	iTunesApp = WScript.CreateObject("iTunes.Application");

var vol = 100;
//vol = iTunesApp.SoundVolume;

iTunesApp.SoundVolume = 0;

iTunesApp.Play();

for(var v=0; v<=vol; v+=2)
  iTunesApp.SoundVolume = v;
