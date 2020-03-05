const mongoose = require('./index.js'),
Model = require('../common/model');
const modelField = ({
  user: { type: String, require: true },
  Code: { type: String},
  pwd: { type: String, require: true },
  avatar: { type: String, default: '' },
  sex: { type: String },
  carts: { type: Array },
  order: { type: Array },
  address: { type: Array },
  SysVersion: { type: Number }
})
var newModel = new Model(modelField);
newModel.create('users', '用户');