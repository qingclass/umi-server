const mongoose = require("./index.js"),
  Model = require("../common/model");
const modelField = {
  title: { type: String, require: true },
  detailInfo: { type: Object },
  priceNow: { type: String },
  priceOrigin: { type: String },
  imgCover: { type: String },
  category: { type: String },
  SysVersion: { type: Number, Name: "版本", IsExtend: false }
};
var newModel = new Model(modelField);
newModel.create("product", "产品");
