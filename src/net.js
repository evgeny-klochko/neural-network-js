//var brain = require('brain');
//var writeFile = require('write');
//var jsonfile = require('jsonfile')

var jimp = require("jimp");
var fs = require('fs');
var writeFile = require('write');
var brain = require('brain');
var jsonfile = require('jsonfile');
var stringify = require('json-stringify');
var matrix = require("lodash-transpose");

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
      folders.forEach(function(folder) {
        fs.readdir(from + '/' + folder, function(err, files) {
          files.forEach(function(file) {
            parseImage(from + '/' + folder + '/' + file)
              .then(function (item) {
                var current = {};
                current.output = {};
                current.input = item.buffer;
                current.output[folder] = 1;
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
    hiddenLayers: [510, 70]
  });
  return new Promise(function (resolve) {
    jsonfile.readFile(samplePath, function(err, obj) {
      training = network.train(obj, {
        errorThresh: 0.04,
        iterations: 10000,
        log: true,
        logPeriod: 10,
        learningRate: 0.01
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

function draw(value, networkPath){
  var image;
  var sample;
  var network = new brain.NeuralNetwork();
  var result = {
    number: 0,
    value: 0
  };

  var bitmap = [];

  return new Promise(function (resolve) {
    jsonfile.readFile(networkPath, function (err, netObj) {
      var outArray = [];
      var max = 0;
      var newInput = [];
      var newWeight = [];
      var newOutput = [];
      network.fromJSON(netObj);
      newInput = [[],[],[],[],[],[],[],[],[],[]];
      newWeight = matrix.transpose(network.weights[1]);
      newOutput = matrix.transpose(network.weights[2]);

      network.weights[0] = newInput;
      network.weights[1] = newWeight;
      network.weights[2] = newOutput;


      var result = network.run([0, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
      resolve(result);
    });
  });
}

function toBrightness(arr) {
  var result = [];
  var brightness;
  var i;

  for (i=0; i <= arr.length - 2; i += 4) {
    brightness = Math.round(arr[i] * 0.299 + arr[i + 1] * 0.587 + arr[i + 2] * 0.114);

    result.push(arr[i]);
    result.push(arr[i + 1]);
    result.push(arr[i + 2]);
    result.push(brightness);
  }

  return result;
}

function fromBrightness(arr) {
  var result = [];
  var i;

  for (i=0; i <= arr.length - 3; i += 4) {
    result.push(arr[i]);
    result.push(arr[i + 1]);
    result.push(arr[i + 2]);
    result.push(255);
  }

  return result;
}


function sobol(path, req) {
  return new Promise(function (resolve) {
    var result;
    var newBuffer = [];
    var newBrightness = [];
    var newImage;
    var noise = [];
    var brightness;
    var threshold = req.body.threshold;
    var blur = req.body.blur;
    var colored = req.body.colored;
    var base64Data = req.body.params.slice(23, req.body.params.length);
    var createdImage = new Buffer(base64Data, 'base64');

    fs.writeFile(path, createdImage, 'base64', function(err) {
      jimp.read(path)
        .then(function (imageItem) {
          var width = imageItem.bitmap.width;
          var arr = [];

          brightness = toBrightness(imageItem.bitmap.data);
          arr = culcMatrix(brightness, width);

          for (var i = 0; i < arr.length; i++) {
            for (var j = 0; j < arr[0].length; j++) {
              if (i !== 0 && j!== 0 && i !== arr.length - 1 && j !== arr[0].length - 1) {
                var X = (arr[i - 1][j + 1][3] + 2 * arr[i][j + 1][3] + arr[i + 1][j + 1][3]) - (arr[i - 1][j - 1][3] + 2 * arr[i][j - 1][3] + arr[i + 1][j - 1][3]);
                var Y = (arr[i - 1][j - 1][3] + 2 * arr[i  - 1][j][3] + arr[i - 1][j][3]) - (arr[i + 1][j - 1][3] + 2 * arr[i + 1][j][3] + arr[i + 1][j + 1][3]);
                var g = Math.sqrt(Math.pow(X,2) + Math.pow(Y,2));
                if (g > threshold) {
                  if (colored) {
                    noise.push(arr[i][j][0]);
                    noise.push(arr[i][j][1]);
                    noise.push(arr[i][j][2]);
                    noise.push(255);
                  } else {
                    noise.push(0);
                    noise.push(0);
                    noise.push(0);
                    noise.push(255);
                  }
                } else {
                  noise.push(255);
                  noise.push(255);
                  noise.push(255);
                  noise.push(255);
                }
              } else {
                noise.push(255);
                noise.push(255);
                noise.push(255);
                noise.push(255);
              }
            }
          }

          newBuffer = noise;

          //newBuffer = fromBrightness(brightness);


          newImage = new Buffer(newBuffer);
          imageItem.bitmap.data = newImage;
          if (blur > 0) {
            imageItem.gaussian(blur);
          }
          imageItem.getBase64(jimp.MIME_JPEG, function (err, result) {
            resolve(result);
          })
          imageItem.write('../123.jpg');
          console.log(new Date());

        });
    });
  });
}


function culcMatrix(vector, width) {
  var result = [];
  var row = [];
  var pixel = [];
  var colorIndex = 0;
  var pixelIndex = 0;

  vector.forEach(function (item, index) {
    if (colorIndex < (width * 4) - 1) {
      if (pixelIndex < 3) {
        pixel.push(item);
        colorIndex++;
        pixelIndex++;
      } else {
        pixel.push(item);
        colorIndex++;
        row.push(pixel);
        pixel = [];
        pixelIndex = 0;
      }
    } else {
      pixel.push(item);
      row.push(pixel);
      result.push(row);
      pixel = [];
      row = [];
      pixelIndex = 0;
      colorIndex = 0;
    }
  });

  return result;
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
module.exports.draw = draw;
module.exports.sobol = sobol;
module.exports.recognize = recognize;