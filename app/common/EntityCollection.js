'use strict';
var EntityClass = require('./Entity');

var _entityCollection = {};

exports.addEntity = function(entityName, name, parentEntity, parentField){
    var newEntity = new EntityClass(entityName, name, parentEntity, parentField);
    _entityCollection[entityName] = newEntity;
    // console.log(newEntity instanceof EntityClass);
    console.log(_entityCollection);
    return newEntity;

};

exports.getEntity = function(entityName){
    var entity = _entityCollection[entityName];
    if(entity == undefined || entity == null){
        console.log("警告：获取实体 " + entityName + " 不存在，请检查程序");
        return null;
    }
    return entity;
};

exports.getEntitys = function(){
    var entitys = [];
    for(var p in _entityCollection){
        entitys.push({
            EntityName: _entityCollection[p].EntityName,
            Name: _entityCollection[p].Name,
            Fields: _entityCollection[p].Fields
        });
    }
    return entitys;
};