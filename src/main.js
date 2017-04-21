var express = require('express');
var jimp = require("jimp");
var brain = require('brain');
var fs = require('fs');
var writeFile = require('write');
var jsonfile = require('jsonfile')
var questionNet = require('./questionNet');
var bodyParser = require('body-parser');

var myNet = require('./net');
require('./json');

//var gg = myNet.parseImage('../images/numbers/1.jpg');
//
//
//gg
//  .then(function (response) {
//    console.log(response);
//  })

function allowCrossOrogin(res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
}

var app = express();
app.set('view engine', 'ejs');
app.use( bodyParser.json() );


app.all('/', function (req, res, next) {
  allowCrossOrogin(res, next)
  res.send('hello world');
})

app.all('/prepare', function (req, res, next) {
  allowCrossOrogin(res, next)
});

app.all('/learn', function (req, res, next) {
  allowCrossOrogin(res, next)
});

app.all('/use', function (req, res, next) {
  allowCrossOrogin(res, next)
})

app.get('/prepare', function (req, res, next) {
  myNet.prepare('../images/folders', '../samples/new.json')
    .then(function(response) {
      res.send('prepared');
    })
})

app.get('/learn', function (req, res, next) {
  myNet.learn('../samples/new.json', '../network/new.json')
    .then(function(response) {
      res.send(response);
    })
})

app.get('/use', function (req, res, next) {
  myNet.use('../images/forTest', '../network/new.json')
    .then(function(response) {
      res.send(response)
    })
})

app.post('/use', function (req, res, next) {
  var store = '../images/tmp/';
  var forTest = '../images/forTest';
  var testItem = '/out.jpg';
  var network = '../network/new.json';

  myNet.recognize(req, store, forTest, testItem, network)
    .then(function (response) {
      res.send(response);
    });

})

app.listen(1337, function () {
  console.log('Express listennig');
});
