function includeFile (filename) {
      var fso = new ActiveXObject ("Scripting.FileSystemObject");
      var fileStream = fso.openTextFile (filename);
      var fileData = fileStream.readAll();
      fileStream.Close();
      eval(fileData);
  }
  
  
includeFile("json2.js");

var	iTunesApp = WScript.CreateObject("iTunes.Application");

var windows = iTunesApp.Windows;

WScript.echo(JSON.stringify(iTunesApp));

WScript.echo('windows count='+windows.Count);

for(var t=1; t <= windows.Count; t++) {
  var window = windows.Item(t);

  WScript.echo('kind='+window.kind);
}
