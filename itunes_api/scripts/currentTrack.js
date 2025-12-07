var	iTunesApp = WScript.CreateObject("iTunes.Application");

if(!iTunesApp) {
	WScript.echo('{"error":"no iTunesApp"}');
}
else{
	var track = iTunesApp.CurrentTrack;

	function includeFile (filename) {
				var fso = new ActiveXObject ("Scripting.FileSystemObject");
				var fileStream = fso.openTextFile (filename);
				var fileData = fileStream.readAll();
				fileStream.Close();
				eval(fileData);
		}
			
	includeFile("json2.js");
	includeFile("utils.js");

	if(track)
	{
		var tr = {
			"name":track.Name,
			"album":track.Album,
			"artist":track.Artist,
			"albumArtist":track.AlbumArtist,
			"composer":track.Composer,
			"id_low":iTunesApp.ITObjectPersistentIDLow(track),
			"id_high":iTunesApp.ITObjectPersistentIDHigh(track),
			"trackNumber":track.TrackNumber,
			"trackCount":track.TrackCount,
			"compilation":track.Compilation,
			"kind": track.Kind,
			"bitRate":track.BitRate,
			"duration":track.Duration,
      "rating":track.Rating,
      "enabled":track.Enabled,
			"sampleRate":track.SampleRate,
			"type":track.KindAsString,
			"comment":track.Comment,
			"year":track.Year,
			"playedCount":track.PlayedCount,
			"playedDate": (track.PlayedDate && track.PlayedDate.getFullYear() > 1900) ? dateToString(track.PlayedDate) : "",
			"grouping":track.Grouping,
			"volumeAdjustment": track.VolumeAdjustment
		};
		
		if(track.ratingKind)	// auto rating
			tr.rating = 0;

		WScript.echo(JSON.stringify(tr));
	/*  
		var lists = track.Playlists;
		
		for(var i=1; i<=lists.Count; i++)
		{
			var list = lists.Item(i);
			
			WScript.echo('name='+list.Name+' kind='+list.Kind+' source.kind='+list.Source.Kind);
		}
		
		var list =track.Playlist;
		WScript.echo('name='+list.Name+' kind='+list.Kind+' source.kind='+list.Source.Kind);
		*/
	}
	else
	{
		WScript.echo('{"error":"no track"}');
	}
}

