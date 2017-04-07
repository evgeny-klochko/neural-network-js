var express = require('express');
var jimp = require("jimp");
var brain = require('brain');
var fs = require('fs');
var writeFile = require('write');
var jsonfile = require('jsonfile')
var net = new brain.NeuralNetwork({
  hiddenLayers: [300, 150]
});
var training = {};


var app = express();
app.set('view engine', 'ejs');

function processImage(image) {
  var result = {};
  var img = image

  return jimp.read(img)
    .then(function (item) {
      var brightness;
      var vector = [];
      var pixel = [];

      var i = 0;
      item.bitmap.data.forEach(function (item) {
        if (i !== 3) {
          pixel.push(item);
          i = i + 1;
        } else {
          vector.push(pixel);
          pixel = [];
          i = 0;
        }
      });
      result.bitmap = vector;
      result.brightness = calcBrightness(vector);
      result.map = divideTiRows(item, result.brightness);

      return result;
    });
}

function divideTiRows(image, vector) {
  var result = [];
  var row = [];
  var image = image;
  var vector = vector;
  var width = image.bitmap.width;
  var height = image.bitmap.height;
  var i = 0;


  vector.forEach(function (item) {

    i = i + 1;
    if (i < width) {
      row.push(item);
    } else {
      row.push(item);
      result.push(row);
      row = [];
      i = 0;
    }
  });

  return result;
}
var sq = [
  [0, 255, 0, 0, 255],
  [255, 0, 255, 0, 255],
  [0, 0, 255, 0, 255],
  [0, 255, 0, 0, 255],
  [255, 0, 255, 0, 255],
  [0, 255, 0, 0, 255]
];

function prepareImage(path) {
  var bitmap = [];
  fs.readdir(path, function (err, files) {
    var file = files[0];
    console.log(file);
    processImage(path + '/' + file)
      .then(function (item) {
        var current = {};
        current.input = item.brightness;
        bitmap.push(current);
      });
  })
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

function createSample(path) {
  var sample = [];
  fs.readdir(path, function (err, files) {
    console.log(files);
    files.forEach(function(file, fileIndex) {
      processImage(path + '/' + file)
        .then(function (item) {
          var current = {};
          current.output = {};
          current.input = item.brightness;
          current.output[fileIndex + 1] = 1;
          sample.push(current);
          writeFile('../samples/numbers.json', JSON.stringify(sample));
          console.log('written');
        });
    });
  });
  return sample;
}

function createSampleFromFolders(path) {
  var sample = [];
  fs.readdir(path, function (err, folders) {
    console.log(folders);
    folders.forEach(function(folder) {
      fs.readdir(path + '/' + folder, function(err, files) {
        console.log(files);
        files.forEach(function(file) {
          processImage(path + '/' + folder + '/' + file)
            .then(function (item) {
              var current = {};
              current.output = {};
              current.input = item.brightness;
              current.output[folder] = 1;
              sample.push(current);
              writeFile('../samples/numbers.json', JSON.stringify(sample));
              console.log('written');
            });
        });
      })
    });
  });
  return sample;
}


app.get('/prepare', function (req, res) {
  var res = createSample('../images/numbers');
})

app.get('/prepare/folders', function (req, res) {
  var res = createSampleFromFolders('../images/folders');
})

app.get('/prepare/figures', function (req, res) {
  var res = createSampleFromFolders('../images/figures');
})

app.get('/learn', function (req, res) {
  var sample;
  var samplePath = '../samples/numbers.json';

  jsonfile.readFile(samplePath, function(err, obj) {
    training = net.train(obj, {
      errorThresh: 0.0005,
      iterations: 20000,
      log: true,
      logPeriod: 20,
      learningRate: 0.1
    });

    writeFile('../network/net.json', JSON.stringify(net), function () {
      console.log('network has been saved');
    });
    res.send(training);
  });

app.get('/test/:id', function (req, res) {
  var sample;
  var network = new brain.NeuralNetwork({
    hiddenLayers: [300, 150]
  });
  var result = {
    value: 0
  };
  var id = req.params.id;
  var samplePath = '../samples/numbers.json';
  jsonfile.readFile('../network/net.json', function (err, netObj) {
    jsonfile.readFile(samplePath, function(err, obj) {
      var outArray = [];
      var max = 0;
      network.fromJSON(netObj);
      var output = network.run(obj[id - 1].input);
      for (key in output) {
        outArray.push(output[key]);
      }
      outArray.forEach(function (item,index) {
        if (item > max) {
          max = item;
          result.value = index;
        }
      });
      res.send(output);
    });
  })
});

});

app.get('/', function (req, res) {
  var sample;
  var network = new brain.NeuralNetwork({
    hiddenLayers: [300, 150]
  });
  var result = {
    value: 0
  };
  var id = 4;
  var samplePath = '../samples/numbers.json';

  jsonfile.readFile('../network/net.json', function (err, netObj) {
    jsonfile.readFile(samplePath, function(err, obj) {
      var outArray = [];
      var max = 0;
      network.fromJSON(netObj);
      var output = network.run(obj[id - 1].input);
      for (key in output) {
        outArray.push(output[key]);
      }
      outArray.forEach(function (item,index) {
        if (item > max) {
          max = item;
          result.value = index;
        }
      });
      res.send(output);
    });
  })
});

app.get('/image', function (req, res) {
  var image;
  var path = '../images/forTest'
  var sample;
  var network = new brain.NeuralNetwork({
    hiddenLayers: [300, 150]
  });
  var result = {
    number: 0,
    value: 0
  };

  var bitmap = [];
  var figures = {
    '0': 'rectangle',
    '1': 'round',
    '2': 'square',
    '3': 'treangle'
  };
  fs.readdir(path, function (err, files) {
    var file = files[0];
    console.log(file);
    processImage(path + '/' + file)
      .then(function (item) {
        var current = {};
        current.input = item.brightness;
        bitmap = current.input;
        jsonfile.readFile('../network/net.json', function (err, netObj) {
          var outArray = [];
          var max = 0;
          network.fromJSON(netObj);
          var output = network.run(bitmap);
          console.log(network);
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
          res.render('pages/main', {
            output: JSON.stringify(output),
            max: result.value,
            answer: result.number,
            figure: figures[result.number]
          });
        })
      });
  })


});

app.listen(1337, function () {
  console.log('Express listennig');
});
