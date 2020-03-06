'use strict';
var Schema = require('mongoose').Schema,
    Model = require('../common/model');

var modelField = {};

modelField.Code = {
  type: String,
  Name: '编码',
  IsUnique: true,
  IsEmpty: false,
  trim: true
};
modelField.Name = {
  type: String,
  trim: true,
  Name: '名称'
};
modelField.Password = {
  type: String,
  default: '123456',
  Name: '密码'
};
modelField.Image = {
  type: String,
  default: '',
  Name: '图片'
};
modelField.Email = {
  type: String,
  trim: true,
  default: '',
  Name: 'Email'
};

modelField.Phone = {
  type: String,
  trim: true,
  Name: '电话'
};
var newModel = new Model(modelField);
newModel.addIndex({Phone:1}, { 'unique': true });
newModel.create('User', '用户终端角色');
