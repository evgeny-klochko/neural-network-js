var brain = require('brain');
var jsonfile = require('jsonfile');
var writeFile = require('write');

function prepareData() {
  var net = new brain.NeuralNetwork();
  var datasetPath = '../samples/dev-v1.1.json';
  var dataset = [];
  var counter = 0;

  return new Promise(function (resolve) {
    jsonfile.readFile(datasetPath, function(err, obj) {
      obj.data.forEach(function (item) {
        item.paragraphs.forEach(function (paragraph) {
          paragraph.qas.forEach(function (qasItem) {
            if (counter < 1000) {
              var setItem = {
                input: [counter],
                output: [Math.sqrt(counter, 2)]
              };
                console.log(setItem);
                dataset.push(setItem);
              counter++;
            }
          });
        });
      });
      resolve(dataset);
    });
  })
}

async function trainNet() {
  console.log('init')
  var training;
  var net = new brain.NeuralNetwork();
  var preparedDate = await prepareData();
  console.log('data prepared')
  console.log(preparedDate);

  training = net.train(preparedDate, {
    errorThresh: 0.01,
    iterations: 20000,
    log: true,
    logPeriod: 100,
    learningRate: 0.005
  });
  console.log('network trained');

  writeFile('../network/qaNet.json', JSON.stringify(net), function () {
    console.log('network has been saved');
  });

  return 'well Done';
}

async function useNet() {
  var network = new brain.NeuralNetwork();
  jsonfile.readFile('../network/qaNet.json', function (err, netObj) {
    var output;
    network.fromJSON(netObj);
    output = network.run([1]);
    console.log(output);
  });
}

module.exports.train = trainNet;
module.exports.use = useNet;