const mongoose = require("./index.js"),
  Model = require("../common/model");

const modelField = mongoose.Schema({
  admin: { type: String, require: true },
  pwd: { type: String, require: true },
  avatar: { type: String },
  roles: { type: Array },
  SysVersion: { type: Number, Name: "版本", IsExtend: false }
});

var newModel = new Model(modelField);
newModel.create("admin", "管理员");