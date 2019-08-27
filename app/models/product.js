const mongoose = require('./index.js'),
Model = require('../common/model');
const modelField = ({
  title: { type: String, require: true },
  detailInfo: { type: Object },
  priceNow: { type: String },
  priceOrigin: { type: String },
  imgCover: { type: String },
  category: { type: String }
})
var newModel = new Model(modelField);
newModel.create('product', '产品');
