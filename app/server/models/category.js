const mongoose = require('./index.js'),
Model = require('../common/model');
const modelField = ({
  title: { type: String, require: true },
  SysVersion: {
    type: Number,
    Name: '版本',
    IsExtend: false
}
})
var newModel = new Model(modelField);
newModel.create('category', '分类');
