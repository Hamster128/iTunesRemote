var	iTunesApp = WScript.CreateObject("iTunes.Application");

var vol = 100;
//vol = iTunesApp.SoundVolume;

for(var v=vol; v>=0; v-=8)
  iTunesApp.SoundVolume = v;
  
iTunesApp.Pause();

iTunesApp.SoundVolume = vol;
