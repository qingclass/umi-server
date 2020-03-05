'use strict';

var mongoose = require('mongoose'),
    BaseEnum = require('./Enum'),
    BaseFun = require('./BaseFun'),
    Transaction = require('./BatchEntity');

var Entity = function(entityName, name, parentEntity, parentField){
    this._EntityName = entityName;                      //实体名称
    this._Entity = mongoose.model(this._EntityName);
    this._Name = name;                                  //实体中文名
    this._Childs = new Array();                        //子实体集合
    this._Parent = null;
    this._ParentField = null;                           //对应父实体的字段名
    this._Fields = null;

    if(parentEntity != undefined && parentEntity != null){
        parentEntity.addChilds(this);
        this._Parent = parentEntity;
        this._ParentField = parentField;
    }

    this._EventHandler = new EntityEventHandler();
};

Entity.prototype = {
    get EntityName(){
        return this._EntityName;
    },
    get Name(){
        return this._Name;
    },
    get Entity(){
        return this._Entity;
    },
    get Parent(){
        return this._Parent;
    },
    get ParentField(){
        return this._ParentField;
    },
    get Fields(){
        return this._Fields;
    },
    get Childs(){
        return this._Childs;
    },

    addChilds: function(childEntity){
        this._Childs.push(childEntity);
    },
    addEventListener: function(eventName, handler){
        this._EventHandler.addHandler(eventName, handler);
    },

    save: function(records, resultHandel) {
        if(resultHandel){
            if(records.length > 0) {
                Transaction.BatchSaveByTran([{EntityName: this.EntityName, Records: records}], resultHandel);
            }
            else{
                resultHandel(null, null);
            }
        }
        else{
            return this._savePromise(records);
        }
    },
    delete: function(record, resultHandel){
        if(resultHandel){
            var self = this;
            if(!record.RowStatus){
                record.RowStatus = BaseEnum.RowStatus.Delete.Value;
            }

            self.findById(record._id, null, function(err, data){
                if(err){
                    var newErr = new Error();
                    newErr.level = 5;
                    newErr.title = '【' + self.Name + '】' + '删除前查找错误';
                    newErr.message = err.message;
                    if(resultHandel){
                        resultHandel(newErr);
                    }
                }
                else{
                    var oldRecord = data;
                    record = Object.assign(Object.assign({}, oldRecord), record);
                    record.OriginalData = oldRecord;

                    self._validate(record).then(
                        () => {return self._beforeDelete(record)}
                    ).then(function(data){
                        self._delete(record).then(function(data){
                            self._afterDelete(record).then(function(){
                                if(resultHandel){
                                    resultHandel(null, record);
                                }
                            }).catch(function(err){
                                // 回滚
                                var newEntity = new self.Entity(oldRecord);
                                newEntity.save();

                                var newErr = new Error();
                                newErr.message = '数据删除后出现异常，详细信息：\r\n' + err.message;
                                if(err.hasOwnProperty('title')){
                                    newErr.title = err.title;
                                }
                                else{
                                    newErr.title = '【' + self.Name + '】' + '删除失败';
                                }
                                if(err.hasOwnProperty('level')){
                                    newErr.level = err.level;
                                }
                                else{
                                    newErr.level = 5;
                                }
                                if(resultHandel){
                                    resultHandel(newErr);
                                }
                            });
                        }).catch(function(err){
                            var newErr = new Error();
                            newErr.message = '数据删除时出现异常，详细信息：\r\n' + err.message;
                            if(err.hasOwnProperty('title')){
                                newErr.title = err.title;
                            }
                            else{
                                newErr.title = '【' + self.Name + '】' + '删除失败';
                            }
                            if(err.hasOwnProperty('level')){
                                newErr.level = err.level;
                            }
                            else{
                                newErr.level = 5;
                            }
                            if(resultHandel){
                                resultHandel(newErr);
                            }
                        });
                    }).catch(function(err){
                        var newErr = new Error();
                        newErr.message = '数据删除前出现异常，详细信息：\r\n' + err.message;
                        if(err.hasOwnProperty('title')){
                            newErr.title = err.title;
                        }
                        else{
                            newErr.title = '【' + self.Name + '】' + '删除失败';
                        }
                        if(err.hasOwnProperty('level')){
                            newErr.level = err.level;
                        }
                        else{
                            newErr.level = 5;
                        }
                        if(resultHandel){
                            resultHandel(newErr);
                        }
                    });
                }
            });
        }
        else{
            return this._deletePromise(record);
        }
    },
    update: function(record, resultHandel){
        if(resultHandel){
            var self = this;
            if(!record.RowStatus){
                record.RowStatus = BaseEnum.RowStatus.Modify.Value;
            }

            self.findById(record._id, null, function(err, data){
                if(err){
                    // Sync.unLock('Update-' + record._id);

                    var newErr = new Error();
                    newErr.level = 5;
                    newErr.title = '【' + self.Name + '】' + '修改前查找错误';
                    newErr.message = err.message;
                    if(resultHandel){
                        resultHandel(newErr);
                    }
                }
                else{
                    var oldRecord = data;
                    record = Object.assign(Object.assign({}, oldRecord), record);
                    record.OriginalData = oldRecord;

                    self._setDefaultValue(record).then(
                        () => {return self._validate(record)}
                    ).then(
                        () => {return self._beforeUpdate(record)}
                    ).then(function(){
                        self._update(record).then(function(data){
                            // Sync.unLock('Update-' + record._id);
                            record = data;

                            self._afterUpdate(record).then(function(data){
                                if(resultHandel){
                                    resultHandel(null, record);
                                }
                            }).catch(function(err){
                                // 回滚
                                self.Entity.update({_id: oldRecord._id}, {$set: oldRecord}).exec();

                                var newErr = new Error();
                                newErr.message = '数据修改后出现异常，详细信息：\r\n' + err.message;
                                if(err.hasOwnProperty('title')){
                                    newErr.title = err.title;
                                }
                                else{
                                    newErr.title = '【' + self.Name + '】' + '修改失败';
                                }
                                if(err.hasOwnProperty('level')){
                                    newErr.level = err.level;
                                }
                                else{
                                    newErr.level = 5;
                                }
                                if(resultHandel){
                                    resultHandel(newErr);
                                }
                            });
                        }).catch(function(err){
                            // Sync.unLock('Update-' + record._id);

                            var newErr = new Error();
                            newErr.message = '数据修改时出现异常，详细信息：\r\n' + err.message;
                            if(err.hasOwnProperty('title')){
                                newErr.title = err.title;
                            }
                            else{
                                newErr.title = '【' + self.Name + '】' + '修改失败';
                            }
                            if(err.hasOwnProperty('level')){
                                newErr.level = err.level;
                            }
                            else{
                                newErr.level = 5;
                            }
                            if(resultHandel){
                                resultHandel(newErr);
                            }
                        });
                    }).catch(function(err){
                        // Sync.unLock('Update-' + record._id);

                        var newErr = new Error();
                        newErr.message = '数据修改前出现异常，详细信息：\r\n' + err.message;
                        if(err.hasOwnProperty('title')){
                            newErr.title = err.title;
                        }
                        else{
                            newErr.title = '【' + self.Name + '】' + '修改失败';
                        }
                        if(err.hasOwnProperty('level')){
                            newErr.level = err.level;
                        }
                        else{
                            newErr.level = 5;
                        }
                        if(resultHandel){
                            resultHandel(newErr);
                        }
                    });
                }
            });
        }
        else{
            return this._updatePromise(record);
        }
    },
    insert: function(record, resultHandel){
        if(resultHandel){
            var self = this;
            var originalId;
            if(record.OriginalId){
                originalId = record.OriginalId;
            }
            else{
                originalId = record._id;
            }
            if(record._id == null || record._id == undefined || record._id.constructor === Number){
                record._id = BaseFun.getObjectId();
            }
            if(!record.RowStatus){
                record.RowStatus = BaseEnum.RowStatus.Insert.Value;
            }

            this._setDefaultValue(record).then(
                () => {return self._validate(record)}
            ).then(
                () => {return self._beforeInsert(record)}
            ).then(function(data){
                self._insert(record).then(function(data){
                    record = data._doc;
                    record.OriginalId = originalId;
                    self._afterInsert(record).then(function(){
                        if(resultHandel){
                            resultHandel(null, record);
                        }
                    }).catch(function(err){
                        // 回滚
                        self.Entity.remove({_id: record._id}).exec();

                        var newErr = new Error();
                        newErr.message = '数据新增后出现异常，详细信息：\r\n' + err.message;
                        if(err.hasOwnProperty('title')){
                            newErr.title = err.title;
                        }
                        else{
                            newErr.title = '【' + self.Name + '】' + '插入失败';
                        }
                        if(err.hasOwnProperty('level')){
                            newErr.level = err.level;
                        }
                        else{
                            newErr.level = 5;
                        }
                        if(resultHandel){
                            resultHandel(newErr);
                        }
                    });
                }).catch(function(err){
                    var newErr = new Error();
                    newErr.message = '数据新增时出现异常，详细信息：\r\n' + err.message;
                    if(err.hasOwnProperty('title')){
                        newErr.title = err.title;
                    }
                    else{
                        newErr.title = '【' + self.Name + '】' + '插入失败';
                    }
                    if(err.hasOwnProperty('level')){
                        newErr.level = err.level;
                    }
                    else{
                        newErr.level = 5;
                    }
                    if(resultHandel){
                        resultHandel(newErr);
                    }
                });
            }).catch(function(err){
                var newErr = new Error();
                newErr.message = '数据新增前出现异常，详细信息：\r\n' + err.message;
                if(err.hasOwnProperty('title')){
                    newErr.title = err.title;
                }
                else{
                    newErr.title = '【' + self.Name + '】' + '插入失败';
                }
                if(err.hasOwnProperty('level')){
                    newErr.level = err.level;
                }
                else{
                    newErr.level = 5;
                }
                if(resultHandel){
                    resultHandel(newErr);
                }
            });
        }
        else{
            return this._insertPromise(record);
        }
    },
    deleteById: function(id, resultHandel){
        if(resultHandel){
            this.deleteByIds([id], resultHandel);
        }
        else{
            return this._deleteByIdPromise(id);
        }
    },
    deleteByIds: function(ids, resultHandel){
        if(resultHandel){
            let self = this;
            if(this.Childs.length > 0){
                let promise = [];

                for(var i=0; i<this.Childs.length; i++){
                    promise.push(this.Childs[i].deleteByCondition(eval("({" + this.EntityName + ": {$in: ids}})")));
                }

                Promise.all(promise).then(function(data){
                    return self.deleteByCondition({_id: {$in: ids}});
                }).then(function(data){
                    resultHandel(null, data);
                }).catch(function(err){
                    resultHandel(err);
                });
            }
            else{
                this.deleteByCondition({_id: {$in: ids}}).then(function(data){
                    resultHandel(null, data);
                }).catch(function(err){
                    resultHandel(err);
                });
            }
        }
        else{
            return this._deleteByIdsPromise(ids);
        }
    },
    deleteByCondition: function(condition, resultHandel){
        if(resultHandel){
            var self = this;
            this.find(condition, null, null, function(err, records){
                if(err){
                    var newErr = new Error();
                    newErr.level = 5;
                    newErr.title = '【' + self.Name + '】' + '删除前查找错误';
                    newErr.message = err.message;
                    if(resultHandel != null && resultHandel != undefined) {
                        resultHandel(newErr);
                    }
                }
                else{
                    for(var i=0; i<records.length; i++){
                        records[i].RowStatus = BaseEnum.RowStatus.Delete.Value;
                    }
                    self.save(records, resultHandel);
                }
            });
        }
        else{
            return this._deleteByConditionPromise(condition);
        }
    },
    updateByValue: function(condition, value, resultHandel){
        if(resultHandel){
            var self = this;
            BaseFun.formatCondition(self, condition, function(err, newCondition){
                if(err){
                    if(resultHandel){
                        resultHandel(err);
                    }
                }
                else{
                    self.find(newCondition, null, null, function(err, records){
                        if(err){
                            var newErr = new Error();
                            newErr.level = 5;
                            newErr.title = '【' + self.Name + '】' + '删除前查找错误';
                            newErr.message = err.message;
                            if(resultHandel != null && resultHandel != undefined) {
                                resultHandel(newErr);
                            }
                        }
                        else{
                            for(var i=0; i<records.length; i++){
                                records[i] = Object.assign(records[i], value);
                                records[i].RowStatus = BaseEnum.RowStatus.Modify.Value;
                            }
                            self.save(records, resultHandel);
                        }
                    });
                }
            });
        }
        else{
            return this._updateByValuePromise(condition, value);
        }
    },

    find: function(condition, orderBy, populate, resultHandel){
        if(resultHandel){
            if(populate == undefined || populate == null){
                populate = '';
            }
            var self = this;
            BaseFun.formatCondition(self, condition, function(err, newCondition){
                if(err){
                    resultHandel(err);
                }
                else{
                    self.Entity.find(newCondition).populate(populate).sort(orderBy).exec(function (err, records) {
                        if (err) {
                            var newErr = new Error();
                            newErr.level = 5;
                            newErr.title = '【' + self.Name + '】' + '查找错误';
                            newErr.message = err.message;
                            resultHandel(newErr);
                        }
                        else {
                            for(var i=0; i<records.length; i++){
                                records[i] = records[i]._doc;
                            }
                            resultHandel(null, records);
                        }
                    });
                }
            });
        }
        else{
            return this._findPromise(condition, orderBy, populate);
        }
    },
    findById: function(id, populate, resultHandel){
        if(resultHandel){
            if(populate == undefined || populate == null){
                populate = '';
            }
            var self = this;
            this.Entity.findById(id).populate(populate).exec(function(err, data){
                if(err){
                    var newErr = new Error();
                    newErr.level = 5;
                    newErr.title = '【' + self.Name + '】' + '查找错误';
                    newErr.message = err.message;
                    if(resultHandel != null && resultHandel != undefined) {
                        resultHandel(newErr);
                    }
                } else {
                    if(resultHandel != null && resultHandel != undefined) {
                        if (data){
                            resultHandel(null, data._doc);
                        }
                        else{
                            resultHandel(null, null);
                        }
                    }
                }
            });
        }
        else{
            return this._findByIdPromise(id, populate);
        }
    },
    findOne: function(condition, populate, resultHandel){
        if(resultHandel){
            if(populate == undefined || populate == null){
                populate = '';
            }
            var self = this;
            BaseFun.formatCondition(self, condition, function(err, newCondition){
                if(err){
                    resultHandel(err);
                }
                else{
                    self.Entity.findOne(newCondition).populate(populate).exec(function(err, data){
                        if(err){
                            var newErr = new Error();
                            newErr.level = 5;
                            newErr.title = '【' + self.Name + '】' + '查找错误';
                            newErr.message = err.message;
                            if(resultHandel != null && resultHandel != undefined) {
                                resultHandel(newErr);
                            }
                        }
                        else{
                            if(resultHandel != null && resultHandel != undefined) {
                                if(data){
                                    resultHandel(null, data._doc);
                                }
                                else{
                                    resultHandel(null, null);
                                }
                            }
                        }
                    });
                }
            });
        }
        else{
            return this._findOnePromise(condition, populate);
        }
    },
    isExist: function (condition) {
        var self = this;
        return new Promise(function (resolve, reject) {
            self.Entity.findOne(condition, null).exec(function (err, data) {
                if (err) {
                    var newErr = new Error();
                    newErr.level = 5;
                    newErr.title = '【' + self.Name + '】' + '查找错误';
                    newErr.message = err.message;
                    reject(newErr);
                }
                else {
                    if (data) {
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                }
            });
        });
    },

    pageQuery: function(condition, orderBy, populate, pageNum, pageSize, resultHandel) {
        if(resultHandel){
            if(populate == undefined || populate == null){
                populate = '';
            }
            var self = this;
            BaseFun.formatCondition(self, condition, function(err, newCondition){
                if(err){
                    resultHandel(err);
                }
                else{
                    self.Entity.find(newCondition)
                        .populate(populate).sort(orderBy)
                        .skip(pageNum * pageSize)
                        .limit(pageSize)
                        .exec(function(err, records){
                        if(err){
                            var newErr = new Error();
                            newErr.level = 5;
                            newErr.title = '【' + self.Name + '】' + '查找错误';
                            newErr.message = err.message;
                            if(resultHandel != null && resultHandel != undefined) {
                                resultHandel(newErr);
                            }
                        }
                        else{
                            if(records){
                                for(var i=0; i<records.length; i++) {
                                    records[i] = records[i]._doc;
                                }
                                resultHandel(null, records);
                            }
                            else{
                                resultHandel(null, []);
                            }
                        }
                    });
                }
            });
        }
        else{
            return this._pageQueryPromise(condition, orderBy, populate, pageNum, pageSize);
        }
    },
    queryRecordCount: function(condition, resultHandel){
        if(resultHandel){
            var self = this;
            BaseFun.formatCondition(self, condition, function(err, newCondition){
                if(err){
                    resultHandel(err);
                }
                else{
                    self.Entity.find(newCondition).count().exec(function(err, data){
                        if(err){
                            var newErr = new Error();
                            newErr.level = 5;
                            newErr.title = '【' + self.Name + '】' + '查找错误';
                            newErr.message = err.message;
                            if(resultHandel != null && resultHandel != undefined) {
                                resultHandel(newErr);
                            }
                        }
                        else{
                            resultHandel(null, data);
                        }
                    });
                }
            });
        }
        else{
            return this._queryRecordCountPromise(condition);
        }
    },
    findRecordIndex: function(id, condition, orderBy, resultHandel){
        if(resultHandel){
            var self = this;
            BaseFun.formatCondition(self, condition, function(err, newCondition){
                if(err){
                    resultHandel(err);
                }
                else{
                    self.Entity.find(newCondition, {'_id' : 1}).sort(orderBy)
                        .exec(function(err, records){
                        if(err){
                            var newErr = new Error();
                            newErr.level = 5;
                            newErr.title = '【' + self.Name + '】' + '查找错误';
                            newErr.message = err.message;
                            if(resultHandel != null && resultHandel != undefined) {
                                resultHandel(newErr);
                            }
                        }
                        else{
                            var returnData = {
                                Index: -1,
                                Count: records.length
                            }
                            for(var i=0; i<records.length; i++){
                                if(records[i]._id == id){
                                    returnData.Index = i;
                                    break;
                                }
                            }
                            if(resultHandel != null && resultHandel != undefined) {
                                resultHandel(null, returnData);
                                // resultHandel(null, {
                                //     Length: data.length,
                                //     Index: data.toString().replace(/ /g,'').split(',').indexOf('{_id:' + id + '}')
                                // });
                            }
                        }
                    });
                }
            });
        }
        else{
            return this._findRecordIndexPromise(id, condition, orderBy);
        }
    },
    search: function(text, filter, limit, resultHandel){
        if(resultHandel){
            var self = this;
            this.Entity.db.db.command({text: this.EntityName, search: text, filter: filter, limit: limit }, function(err, data){
                if(err){
                    var newErr = new Error();
                    newErr.level = 5;
                    newErr.title = '【' + self.Name + '】' + '查找错误';
                    newErr.message = err.message;
                    if(resultHandel != null && resultHandel != undefined) {
                        resultHandel(newErr);
                    }
                }
                else{
                    var records = [];
                    for(var i=0; i<data.results.length; i++) {
                        records.push(data.results[i].obj);
                    }
                    resultHandel(null, records);
                }
            });
        }
        else{
            return this._searchPromise(text, filter, limit);
        }
    },
    distinct: function(field, condition, resultHandel){
        if(resultHandel){
            var self = this;
            BaseFun.formatCondition(this, condition, function(err, newCondition){
                if(err){
                    resultHandel(err);
                }
                else{
                    self.Entity.distinct(field, newCondition, function(err, records){
                        if(err){
                            var newErr = new Error();
                            newErr.level = 5;
                            newErr.title = '【' + self.Name + '】' + '查询错误';
                            newErr.message = err.message;
                            if(resultHandel != null && resultHandel != undefined) {
                                resultHandel(newErr);
                            }
                        }
                        else{
                            if(resultHandel != null && resultHandel != undefined) {
                                resultHandel(null, records);
                            }
                        }
                    });
                }
            });
        }
        else{
            return this._distinctPromise(field, condition);
        }
    },

    //聚合函数
    mapReduce: function(option, condition, orderBy, resultHandel){
        var collecationName = "Tmp_" + BaseFun.getGuid();
        option.out = {replace: collecationName};
        option.verbose = true;
        this.Entity.mapReduce(option, function(err, model, stats){
            if(err){
                var newErr = new Error();
                newErr.level = 5;
                newErr.title = '【' + self.Name + '】' + '查找错误';
                newErr.message = err.message;
                if(resultHandel != null && resultHandel != undefined) {
                    resultHandel(newErr);
                }
            }
            else{
                console.log('处理时间：', stats.processtime)
                model.find(condition).sort(orderBy).exec(function (err, data) {
                    mongoose.connection.db.dropCollection(collecationName);
                    if(err){
                        var newErr = new Error();
                        newErr.level = 5;
                        newErr.title = '【' + self.Name + '】' + 'MapReduce完成后查找错误';
                        newErr.message = err.message;
                        if(resultHandel != null && resultHandel != undefined) {
                            resultHandel(newErr);
                        }
                    }
                    else{
                        resultHandel(null, data);
                    }
                });
            }
        });
    },
    aggregate: function(args, resultHandel){
        var self = this;
        BaseFun.formatCondition(self, args[0]['$match'], function(err, newCondition){
            if(err){
                resultHandel(err);
            }
            else{
                let idToObjectId = function(obj){
                    if(obj.constructor == Object || obj.constructor == Array){
                        for(let p in obj){
                            let val = obj[p];
                            if(val){
                                if(val.constructor == String){
                                    if(val.length == 24){
                                        let matchs = val.match(/[a-f\d]{24}/gi);
                                        if(matchs && matchs.length > 0){
                                            obj[p] = mongoose.Types.ObjectId(val);
                                        }
                                    }
                                }
                                else if(val.constructor == Object){
                                    if(val._id && val._id.constructor == String && val._id.length == 24){
                                        obj[p] = mongoose.Types.ObjectId(val._id);
                                    }
                                    else{
                                        obj[p] = idToObjectId(val);
                                    }
                                }
                                else if(val.constructor == Array){
                                    obj[p] = idToObjectId(val);
                                }
                            }
                        }
                    }

                    return obj;
                };

                newCondition = idToObjectId(newCondition);
                args[0]['$match'] = newCondition;

                self.Entity.aggregate(args).exec(function(err, data){
                    if(err){
                        var newErr = new Error();
                        newErr.level = 5;
                        newErr.title = '【' + self.Name + '】' + '查找错误';
                        newErr.message = err.message;
                        if(resultHandel != null && resultHandel != undefined) {
                            resultHandel(newErr);
                        }
                    }
                    else{
                        resultHandel(null, data);
                    }
                });
            }
        });
    },
    aggregateSum: function(groupFieldName, valueFieldName, condition, resultHandel){
        var self = this;
        this.aggregate([
            {$match: condition},
            {$group : {_id : groupFieldName, value : {$sum: '$' + valueFieldName}}},
            {$sort: {value: 1}}
        ], function(err, data){
            if(err){
                var newErr = new Error();
                newErr.level = 5;
                newErr.title = '【' + self.Name + '】' + '查找错误';
                newErr.message = err.message;
                if(resultHandel != null && resultHandel != undefined) {
                    resultHandel(newErr);
                }
            }
            else{
                resultHandel(null, data);
            }
        });
    },
    aggregateCount: function(groupFieldName, condition, resultHandel){
        var self = this;
        this.aggregate([
            {$match: condition},
            {$group : {_id : '$' + groupFieldName, value : {$sum: 1}}},
            {$sort: {value: 1}}
        ], function(err, data){
            if(err){
                var newErr = new Error();
                newErr.level = 5;
                newErr.title = '【' + self.Name + '】' + '查找错误';
                newErr.message = err.message;
                if(resultHandel != null && resultHandel != undefined) {
                    resultHandel(newErr);
                }
            }
            else{
                resultHandel(null, data);
            }
        });
    },
    aggregateAvg: function(groupFieldName, valueFieldName, condition, resultHandel){
        var self = this;
        this.aggregate([
            {$match: condition},
            {$group : {_id : '$' + groupFieldName, value : {$avg: '$' + valueFieldName}}},
            {$sort: {value: 1}}
        ], function(err, data){
            if(err){
                var newErr = new Error();
                newErr.level = 5;
                newErr.title = '【' + self.Name + '】' + '查找错误';
                newErr.message = err.message;
                if(resultHandel != null && resultHandel != undefined) {
                    resultHandel(newErr);
                }
            }
            else{
                resultHandel(null, data);
            }
        });
    },
    aggregateMax: function(groupFieldName, valueFieldName, condition, resultHandel){
        var self = this;
        this.aggregate([
            {$match: condition},
            {$group : {_id : '$' + groupFieldName, value : {$max: '$' + valueFieldName}}},
            {$sort: {value: 1}}
        ], function(err, data){
            if(err){
                var newErr = new Error();
                newErr.level = 5;
                newErr.title = '【' + self.Name + '】' + '查找错误';
                newErr.message = err.message;
                if(resultHandel != null && resultHandel != undefined) {
                    resultHandel(newErr);
                }
            }
            else{
                resultHandel(null, data);
            }
        });
    },
    aggregateMin: function(groupFieldName, valueFieldName, condition, resultHandel){
        var self = this;
        this.aggregate([
            {$match: condition},
            {$group : {_id : '$' + groupFieldName, value : {$min: '$' + valueFieldName}}},
            {$sort: {value: 1}}
        ], function(err, data){
            if(err){
                var newErr = new Error();
                newErr.level = 5;
                newErr.title = '【' + self.Name + '】' + '查找错误';
                newErr.message = err.message;
                if(resultHandel != null && resultHandel != undefined) {
                    resultHandel(newErr);
                }
            }
            else{
                resultHandel(null, data);
            }
        });
    },

    // Promise
    _savePromise: function(records){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.save(records, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _deletePromise: function(record){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.delete(record, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _updatePromise: function(record){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.update(record, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _insertPromise: function(record){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.insert(record, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _deleteByIdPromise: function(id){
        return this._deleteByIdsPromise([id]);
    },
    _deleteByIdsPromise: function(ids){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.deleteByIds(ids, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _deleteByConditionPromise: function(condition){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.deleteByCondition(condition, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _updateByValuePromise: function(condition, value){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.updateByValue(condition, value, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _findPromise: function(condition, orderBy, populate){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.find(condition, orderBy, populate, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _findByIdPromise: function(id, populate){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.findById(id, populate, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _findOnePromise: function(condition, populate){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.findOne(condition, populate, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _pageQueryPromise: function(condition, orderBy, populate, pageNum, pageSize){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.pageQuery(condition, orderBy, populate, pageNum, pageSize, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _queryRecordCountPromise: function(condition){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.queryRecordCount(condition, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _findRecordIndexPromise: function(id, condition, orderBy){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.findRecordIndex(id, condition, orderBy, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _searchPromise: function(text, filter, limit){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.search(text, filter, limit, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },
    _distinctPromise: function(field, condition){
        let self = this;
        return new Promise(function(resolve, reject) {
            self.distinct(field, condition, function(err, data){
                if(err){
                    reject(err);
                }
                else{
                    resolve(data);
                }
            });
        });
    },

    // 持久化过程
    _setDefaultValue: function(record){
        if(record.RowStatus == BaseEnum.RowStatus.Insert.Value){
            if(!record.CreatedOn){
              record.CreatedOn = new Date();
            }
            record.SysVersion = 0;
        }
        else if(record.RowStatus == BaseEnum.RowStatus.Modify.Value){
            record.ModifyOn = new Date();
        }

        return this._EventHandler.execHandler("SetDefaultValue", record);
    },
    _validate: function(record){
        var self = this;
        if(record.RowStatus == BaseEnum.RowStatus.Delete.Value){
            return new Promise(function(resolve, reject) {
                self._EventHandler.execHandler("Validate", record).then(
                    () => resolve(record)
                ).catch(
                    err => reject(err)
                );
            });
        }
        else if(record.RowStatus == BaseEnum.RowStatus.Modify.Value){
            return new Promise(function(resolve, reject) {
                if(record.OriginalData == null){
                    var newErr = new Error();
                    newErr.level = 1;
                    newErr.title = '【' + self.Name + '】' + '修改错误';
                    newErr.message = '修改数据不存在，可能被删除，请检查';
                    reject(newErr);
                }
                else if(record.OriginalData.SysVersion == undefined || record.OriginalData.SysVersion == null){
                    var newErr = new Error();
                    newErr.level = 1;
                    newErr.title = '【' + self.Name + '】' + '修改错误';
                    newErr.message = '当前数据无版本信息，请检查';
                    reject(newErr);
                }
                else if(record.SysVersion != null && record.SysVersion != undefined && record.OriginalData.SysVersion != record.SysVersion){
                    var newErr = new Error();
                    newErr.level = 9;
                    newErr.title = '【' + self.Name + '】' + '并发异常';
                    newErr.message = '当前数据已被他人修改';
                    reject(newErr);
                }
                else {
                    self._EventHandler.execHandler("Validate", record).then(
                        () => resolve(record)
                    ).catch(
                        err => reject(err)
                    );
                }
            });
        }
        else if(record.RowStatus == BaseEnum.RowStatus.Insert.Value){
            var self = this;
            return new Promise(function(resolve, reject) {
                if(self.Parent){
                    if(record[self.ParentField].constructor === Number){
                        var newErr = new Error();
                        newErr.level = 5;
                        newErr.title = '【' + self.Name + '】' + '新增记录对应的父实体字段【' + self.ParentField + '】没有赋值';
                        newErr.message = err.message;
                        reject(err);
                        return;
                    }
                }
                self._EventHandler.execHandler("Validate", record).then(
                    () => resolve(record)
                ).catch(
                    err => reject(err)
                );
            });
        }
        else{
            return new Promise(function(resolve, reject) {
                resolve(record);
            });
        }
    },
    _beforeDelete: function(record){
        return this._EventHandler.execHandler("Deleting", record);
    },
    _delete: function(record){
        var self = this;

        var promise = new Promise(function(resolve, reject) {            
            self.Entity.remove({_id: record._id}).exec(function(err, data){
                if(err){
                    var newErr = new Error();
                    newErr.level = 5;
                    newErr.title = '【' + self.Name + '】' + '删除错误';
                    newErr.message = err.message;
                    reject(newErr);
                }
                else{
                    resolve(data);
                }
            });
        });
        return promise;
    },
    _afterDelete: function(record){
        return this._EventHandler.execHandler("Deleted", record);
    },
    _beforeUpdate: function(record){
        return this._EventHandler.execHandler("Updating", record);
    },
    _update: function(record){
        delete record.RowStatus;
        var sysVersion = record.SysVersion;
        record.SysVersion = record.SysVersion + 1;

        let updateRecord = {$set: record};
        if(record.$inc){
            updateRecord.$inc = record.$inc;
            delete record.$inc;
            for(let p in updateRecord.$inc){
                delete updateRecord.$set[p];
            }
        }

        var self = this;
        return new Promise(function(resolve, reject) {
            self.Entity.update({_id: record._id, SysVersion: sysVersion}, updateRecord, {overwrite: true})
                .exec(function(err, result) {
                    if (err) {
                        err.leavl = 9;
                        err.title = '【' + self.Name + '】' + '修改错误';
                        reject(err);
                    } else {
                        if(result.nModified > 0) {
                            resolve(record);
                        }
                        else{
                            var newErr = new Error();
                            newErr.level = 9;
                            newErr.title = '【' + self.Name + '】' + '并发异常';
                            newErr.message = '当前数据版本不一致，已被他人修改';
                            reject(newErr);
                        }
                    }
                }
            );
        });
    },
    _afterUpdate: function(record){
        return this._EventHandler.execHandler("Updated", record);
    },
    _beforeInsert: function(record){
        return this._EventHandler.execHandler("Inserting", record);
    },
    _insert: function(record){
        delete record.RowStatus;

        var self = this;
        var promise = new Promise(function(resolve, reject) {
            var newEntity = new self.Entity(record);
            newEntity.save(function(err, data){
                if(err){
                    var newErr = new Error();
                    newErr.level = 9;
                    newErr.title = '【' + self.Name + '】' + '新增错误';
                    newErr.message = err.message;
                    reject(newErr);
                }
                else{   
                    resolve(data);
                }
            });
        });
        return promise;
    },
    _afterInsert: function(record){
        return this._EventHandler.execHandler("Inserted", record);
    }    
};

var EntityEventHandler = function(){
    this.Handler = {};
};
EntityEventHandler.prototype = {
    addHandler: function(eventName, fun){
        eventName = eventName.trim().toLowerCase();
        if(!this.Handler[eventName]){
            this.Handler[eventName] = [];
        }
        this.Handler[eventName].push(fun);
    },
    execHandler: function(eventName, context){
        eventName = eventName.trim().toLowerCase();
        var handlers = this.Handler[eventName];

        //递归执行
        var execfun = function(index){
            return new Promise(function(resolve, reject) {
                try{
                    var result = handlers[index].apply(context);
                    if(result && result.constructor === Promise){
                        result.then(function(data){ //handlers[index].call(context, 0) 传参写法
                            if(index == handlers.length - 1){
                                resolve();
                            }
                            else{
                                execfun(index + 1).then(function(data){
                                    resolve();
                                }).catch(function(err){
                                    reject(err);
                                });
                            }
                        }).catch(function(err){
                            reject(err);
                        });
                    }
                    else{
                        if(index == handlers.length - 1){
                            resolve();
                        }
                        else{
                            execfun(index + 1).then(function(data){
                                resolve();
                            }).catch(function(err){
                                reject(err);
                            });
                        }
                    }
                }
                catch(err){
                    var newErr = new Error();
                    newErr.message = '数据保存时，执行持久化监听事件出现异常，详细信息：\r\n' + err.message;
                    newErr.title = '修改失败';
                    newErr.level = 5;

                    reject(newErr);
                }
            });
        };

        return new Promise(function(resolve, reject) {
            if(handlers && handlers.constructor === Array && handlers.length > 0){
                execfun(0).then(function(data){
                    resolve();
                }).catch(function(err){
                    reject(err);
                });
            }
            else{
                resolve();
            }
        });
    }
};

module.exports = Entity;