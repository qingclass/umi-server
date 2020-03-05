"use strict";
var mongoose = require("mongoose"),
  Schema = mongoose.Schema,
  BaseEnum = require('./Enum'),
  EntityCollection = require("./EntityCollection");
var _baseField = {
  //版本
  SysVersion: {
    type: Number,
    Name: "版本",
    IsExtend: false
  },
  //创建时间
  CreatedOn: {
    type: Date,
    Name: "创建时间",
    default: Date.now
  },
  //创建人
  CreatedBy: {
    type: String,
    Name: "创建人",
    trim: true
  },
  //修改时间
  ModifyOn: {
    type: Date,
    Name: "修改时间",
    default: Date.now
  },
  //修改人
  ModifyBy: {
    type: String,
    Name: "修改人",
    trim: true
  }
};
module.exports = function(modelField, isDescSeg){
    var referenceEntitys = {};
	for(var p in _baseField){
		modelField[p] = _baseField[p];
	}

    // 增加扩展字段
    if(isDescSeg !== false){
        for(var i=0; i<5; i++){
            let index = (i+1).toString();
            modelField['PubDescSeg' + index] = {
                type: String,
                default: '',
                trim: true,
                Name: '公有段' + index,
                IsPubDescSeg: true
            };
        }
        for(var i=0; i<20; i++){
            let index = (i+1).toString();
            modelField['PrivateDescSeg' + index] = {
                type: String,
                default: '',
                trim: true,
                Name: '私有段' + index,
                IsPrivateDescSeg: true
            };
        }
    }

	this.Fields = Object.assign({}, modelField);

    var schemaFields = Object.assign({}, this.FocusedRecord);
    for(var filedName in modelField){
        if(modelField[filedName].hasOwnProperty('IsEmpyt') && modelField[filedName].IsEmpyt === false){
            modelField[filedName].required = '请输入' + modelField[filedName].Name;
            delete modelField[filedName].IsEmpty;
        }
        if(modelField[filedName].hasOwnProperty('IsUnique') && modelField[filedName].IsUnique === true){
            modelField[filedName].unique = modelField[filedName].Name + '已存在';
            delete modelField[filedName].IsUnique;
        }
    }
	this.Schema = new Schema(modelField);

	//index: 索引，例：{Code: 1}
	//option: 参数，例：{"unique": true}
	this.addIndex = function(index, option){
		this.Schema.index(index, option);
	};

	//entityName: 实体名称，非空空
	//name: 中文名，非空
	//tableName: 表名，默认为entityName
	//parentEntityName: 父实体名称
    //parentField: 对应的父实体字段名，默认为parentEntityName
	this.create = function(entityName, name, tableName, parentEntityName, parentField){
		if(!name){
	        name = entityName;
	    }
	    if(!tableName){
	        tableName = entityName;
	    }

        if(parentEntityName){
            if(!parentField){
                parentField = parentEntityName;
            }
        }
	    var parentEntity = null;
	    if(parentEntityName){
	    	parentEntity = EntityCollection.getEntity(parentEntityName);
	    	if(!parentEntity){
	    		throw new Error("父实体 " + parentEntityName + " 不存在，请检查该实体是否加载！");
	    	}
	    }

        for(var filedName in this.Fields){
            var fieldType = this.Fields[filedName].type;
            var fieldRef = this.Fields[filedName].ref;
            if(fieldType == String){
                this.Fields[filedName].FieldType = BaseEnum.FieldType.String.Value;
            }
            else if(fieldType == Number){
                if(this.Fields[filedName].Enum){
                    this.Fields[filedName].FieldType = BaseEnum.FieldType.Enum.Value;
                }
                else{
                    this.Fields[filedName].FieldType = BaseEnum.FieldType.Number.Value;
                }
            }
            else if(fieldType == Boolean){
                this.Fields[filedName].FieldType = BaseEnum.FieldType.Boolean.Value;
            }
            else if(fieldType == Date){
                this.Fields[filedName].FieldType = BaseEnum.FieldType.Date.Value;
            }
            else if(fieldType == Schema.ObjectId){
                this.Fields[filedName].FieldType = BaseEnum.FieldType.Refer.Value;
                if(!fieldRef){
                    throw new Error(name + "(" + entityName + "): 字段 " + filedName + " 类型是ObjectId，但没有引用类型");
                }
            }
            else if(fieldType.constructor == Array){
                this.Fields[filedName].FieldType = BaseEnum.FieldType.Array.Value;
                if(fieldType[0].type){
                    fieldType = this.Fields[filedName].type[0].type;
                    fieldRef = this.Fields[filedName].type[0].ref;
                }
            }

            if(fieldType == Schema.ObjectId){
                
            }
        }

	    mongoose.model(entityName, this.Schema, tableName);
		var newEntity = EntityCollection.addEntity(entityName, name, parentEntity, parentField);
		newEntity._Fields = this.Fields;
		return newEntity;
	};
};

