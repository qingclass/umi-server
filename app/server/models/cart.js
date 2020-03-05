const mongoose = require("./index.js"),
  Model = require("../common/model");
const modelField = {
  cartId: { type: String },
  SysVersion: { type: Number, Name: "版本", IsExtend: false}
};
var newModel = new Model(modelField);
newModel.create("cart", "卡片");
