'use strict';
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    EntityCollection = require('./EntityCollection');



module.exports = function(modelField, isDescSeg){
    this.Fields = Object.assign({}, modelField);
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

	    mongoose.model(entityName, this.Schema, tableName);
		var newEntity = EntityCollection.addEntity(entityName, name, parentEntity, parentField);
		newEntity._Fields = this.Fields;
		return newEntity;
	};
};
