var	iTunesApp = WScript.CreateObject("iTunes.Application");

var mainLibrary = iTunesApp.LibraryPlaylist;
var otrack = mainLibrary.Tracks.ItemByPersistentID(WScript.Arguments.Item(1), WScript.Arguments.Item(0));

if(otrack) {

  // set PlayedCount
  otrack.PlayedCount = otrack.PlayedCount + 1;

  // set PlayedDate
  var now = new Date();

  // Use UTC values instead of local ones
  var playedDate = now.getUTCDate() + "." +
                   (now.getUTCMonth()+1) + "." +
                   now.getUTCFullYear() + " " +
                   now.getUTCHours() + ":" +
                   now.getUTCMinutes() + ":" +
                   now.getUTCSeconds();

  otrack.PlayedDate = playedDate;

  WScript.echo('PlayedDate=' + otrack.PlayedDate);
}
