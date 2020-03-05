const mongoose = require("./index.js"),
  Model = require("../common/model");
// var modelField = {};
const modelField = {
  title: { type: String },
  img: { type: String },
  url: { type: String },
  SysVersion: { type: Number, Name: "版本", IsExtend: false}
};
var newModel = new Model(modelField);
newModel.create("banner", "轮播图");
