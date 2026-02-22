dateToString = function (date) {

  var d = new Date(date);

  if(d.getFullYear() < 1900)
    return "";

  return d.getFullYear() + "-" +
    ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
    ("0" + d.getDate()).slice(-2) + " " +
    ("0" + d.getHours()).slice(-2) + ":" +
    ("0" + d.getMinutes()).slice(-2);
}		
