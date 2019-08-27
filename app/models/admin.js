const mongoose = require('./index.js'),
Model = require('../common/model');

const modelField = mongoose.Schema({
  admin: { type: String, require: true },
  pwd: { type: String, require: true },
  avatar: { type: String },
  roles: { type: Array }
})

var newModel = new Model(modelField)
newModel.create('admin', '管理员')
