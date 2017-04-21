//var brain = require('brain');
//var writeFile = require('write');
//var jsonfile = require('jsonfile')

var jimp = require("jimp");
var fs = require('fs');
var writeFile = require('write');
var brain = require('brain');
var jsonfile = require('jsonfile');
var stringify = require('json-stringify');

// get image file => return object with image properties
function parseImage(image) {
  var result = {};
  var img = image

  return new Promise(function (resolve) {
    jimp.read(img)
      .then(function (imageItem) {
        var brightness;
        var vector = [];
        var data = [];
        var pixel = [];

        var i = 0;
        imageItem.bitmap.data.forEach(function (item) {
          if (i !== 3) {
            pixel.push(item);
            i = i + 1;
          } else {
            vector.push(pixel);
            pixel = [];
            i = 0;
          }
          data.push(item);
        });
        result.buffer = data;
        result.bitmap = vector;
        result.brightness = calcBrightness(vector);

        resolve(result);
     });
  });
}

function calcBrightness(vector) {
  var result = [];
  var vector = vector;
  vector.forEach(function (item) {
    var pixelBrightness;
    pixelBrightness = Math.round(item[0] * 0.299 + item[1] * 0.587 + item[2] * 0.114);
    result.push(pixelBrightness);
  });

  return result;
}

function createSampleFromFolders(from, to) {
  return new Promise(function (resolve) {
    var sample = [];
    fs.readdir(from, function (err, folders) {
      console.log(folders);
      folders.forEach(function(folder) {
        fs.readdir(from + '/' + folder, function(err, files) {
          console.log(files);
          files.forEach(function(file) {
            parseImage(from + '/' + folder + '/' + file)
              .then(function (item) {
                var current = {};
                current.output = {};
                current.input = item.buffer;
                current.output[folder] = 1;
                console.log(current);
                sample.push(current);
                writeFile(to, JSON.stringify(sample));
              });
          });
        })
      });
    });
    resolve(sample);
  });
}

function learnNetwork(samplePath, saveTo) {
  var training;
  var network = new brain.NeuralNetwork({
    hiddenLayers: [500, 200]
  });
  return new Promise(function (resolve) {
    jsonfile.readFile(samplePath, function(err, obj) {
      training = network.train(obj, {
        errorThresh: 0.005,
        iterations: 20000,
        log: true,
        logPeriod: 10,
        learningRate: 0.02
      });

      writeFile(saveTo, JSON.stringify(network), function () {
        resolve('Network has been trained and saved!');
      });
    });
  })
}

function useNetwork(path, networkPath){
  var image;
  var sample;
  var network = new brain.NeuralNetwork();
  var result = {
    number: 0,
    value: 0
  };

  var bitmap = [];

  return new Promise(function (resolve) {
    fs.readdir(path, function (err, files) {
      var file = files[0];

      parseImage(path + '/' + file)
        .then(function (item) {
          var current = {};
          current.input = item.buffer;
          bitmap = current.input;
          jsonfile.readFile(networkPath, function (err, netObj) {
            var outArray = [];
            var max = 0;
            network.fromJSON(netObj);
            var output = network.run(bitmap);
            for (key in output) {
              outArray.push(output[key]);
            }
            outArray.forEach(function (item,index) {
              if (item > max) {
                max = item;
                result.number = index;
                result.value = max;
              }
            });
            resolve(result);
          })
      });
    });
  })
}

function recognize(req, store, forTest, testItem, network) {
  return new Promise(function (resolve) {
    fs.readdir(store, function (err, files) {
      var id = files.length;
      var base64Data = req.body.params.slice(23, req.body.params.length);
      var newImage = new Buffer(base64Data, 'base64');
      console.log('Base containt: ' + id);
      fs.writeFile(forTest + testItem, newImage, 'base64', function(err) {
        jimp.read(forTest + testItem)
          .then(function (lenna) {
            return lenna.resize(30, 30)
              .quality(100)
              .write(forTest + testItem)
              .write(store + id + '.jpg');
          })
          .then(function (image) {
            useNetwork(forTest, network)
              .then(function(response) {
                resolve(response);
              })
          })
      });
    });
  });
}

module.exports.parseImage = parseImage;
module.exports.prepare = createSampleFromFolders;
module.exports.learn = learnNetwork;
module.exports.use = useNetwork;
module.exports.recognize = recognize;