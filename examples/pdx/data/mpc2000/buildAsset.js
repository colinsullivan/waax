var path = require('path');
var fs = require('fs');

console.log(process.argv[2]);

function getExtension(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
}

var asset = {
  entry: {
    name: "unnamed",
    reference: "www.google.com",
    payload: {}
  }
};

var assetPath = "../data/PADS-10/";

var files = fs.readdirSync(".");
for (var i = 0; i < files.length; ++i) {
  if (getExtension(files[i]) === "wav") {
    asset.entry.payload[i] = assetPath + files[i];
  }
}

console.log(asset);