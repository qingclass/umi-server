const mongoose = require('./index.js'),
Model = require('../common/model');
// var modelField = {};
const modelField = ({
  title: { type: String },
  img: { type: String },
  url: { type: String }
})
var newModel = new Model(modelField);
newModel.create('banner', '轮播图');
