const mongoose = require('./index.js'),
Model = require('../common/model');
const modelField = ({
  cartId: { type: String }
})
var newModel = new Model(modelField);
newModel.create('cart', '卡片');
