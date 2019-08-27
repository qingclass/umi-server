const mongoose = require('./index.js'),
Model = require('../common/model');
const modelField = ({
  title: { type: String, require: true }
})
var newModel = new Model(modelField);
newModel.create('category', '分类');
