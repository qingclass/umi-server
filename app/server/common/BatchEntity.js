var entityCollection = require('./EntityCollection'),
    BaseEnum = require('./Enum'),
    mongoose = require('mongoose');
// 查找entity条件为condition记录集合
// 返回：{Entity: entity, Records: records}
var find = function(entity, condition){
    return new Promise(function(resolve, reject) {
        entity.find(condition, null, null, function(err, records){
            if(err){
                reject(err);
            }
            else{
                if(records.length > 0){
                    resolve({
                        Entity: entity,
                        Records: records
                    });
                }
                else{
                    resolve(null);
                }
            }
        });
    });
};

// 查找当前entity下records对应的所有子实体集合
// 返回：[{Entity: entity, Records: records}]
var findChilds = function(entity, records){
    return new Promise(function(resolve, reject) {
        if(entity.Childs.length > 0 && records.length > 0){
            var childEntityRecords = [];
            var ids = [];
            records.forEach((record) => ids.push(record._id));

            var promises = [];
            for(var i=0; i<entity.Childs.length; i++){
                var condition = {};
                condition[entity.Childs[i].ParentField] = {$in: ids};
                promises.push(find(entity.Childs[i], condition));
            }

            Promise.all(promises).then(function(datas){
                var childPromises = [];
                for(var i=0; i<datas.length; i++){
                    if(datas[i] != null && datas[i].Records.length > 0){
                        childEntityRecords.push(datas[i]);
                        if(datas[i].Entity.Childs.length > 0){
                            childPromises.push(findChilds(datas[i].Entity, datas[i].Records));
                        }
                    }
                }
                if(childPromises.length > 0){
                    Promise.all(childPromises).then(function(datas){
                        if(datas != null && datas.length > 0){
                            for(var i=0; i<datas.length; i++){
                                if(datas[i].length > 0){
                                    childEntityRecords = childEntityRecords.concat(datas[i]);
                                }
                            }
                        }
                        resolve(childEntityRecords);
                    }).catch(function(err){
                        reject(err);
                    });
                }
                else{
                    resolve(childEntityRecords);
                }
            }).catch(function(err){
                reject(err);
            });
        }
        else{
            resolve([]);
        }
    });
};

// 往上查找所有父实体记录，直到没有父实体
// 返回：[{Entity: entity, Records: records}]
var findParents = function(entity, records){
    return new Promise(function(resolve, reject) {
        var parentRecords = [];
        if(entity.Parent){
            var ids = [];
            records.forEach(function(record){
                if(record[entity.ParentField]){
                    ids.push(record[entity.ParentField]);
                }
            });

            find(entity.Parent, {_id: {$in: ids}}).then(function(data){
                if(data){
                    parentRecords.push(data);

                    if(data.Entity.Parent){
                        findParents(data.Entity, data.Records).then(function(datas){
                            if(datas){
                                parentRecords = datas.concat(parentRecords);
                            }
                            resolve(parentRecords);
                        }).catch(function(err){
                            reject(err);
                        });
                    }
                    else{
                        resolve(parentRecords);
                    }
                }
                else{
                    resolve(parentRecords);
                }
            }).catch(function(err){
                reject(err);
            });
        }
        else{
            resolve(parentRecords);
        }
    });
};

// 记录分类，分为三大类，各类中的实体平铺
// 参数：[{EntityName: entityName, Records: records} ...]
// 返回：
// {Insert: {'EntityName1': records1, 'EntityName1': records1, ...},
//  Update: {'EntityName1': records1, 'EntityName1': records1, ...},
//  Delete: {'EntityName1': records1, 'EntityName1': records1, ...}}
var recordClassify = function(entityRecords){
    var saveEntityRecord = {
        Delete: {},
        Update: {},
        Insert: {}
    };
    var setSaveEntityRecord = function(entityName, record){
        if (record.RowStatus == BaseEnum.RowStatus.Delete.Value) {
            if(!saveEntityRecord.Delete.hasOwnProperty(entityName)){
                saveEntityRecord.Delete[entityName] = [];
            }
            saveEntityRecord.Delete[entityName].push(record);
        }
        else if (record.RowStatus == BaseEnum.RowStatus.Modify.Value) {
            if(!saveEntityRecord.Update.hasOwnProperty(entityName)){
                saveEntityRecord.Update[entityName] = [];
            }
            saveEntityRecord.Update[entityName].push(record);
        }
        else if (record.RowStatus == BaseEnum.RowStatus.Insert.Value) {
            if(!saveEntityRecord.Insert.hasOwnProperty(entityName)){
                saveEntityRecord.Insert[entityName] = [];
            }
            saveEntityRecord.Insert[entityName].push(record);
        }
    }

    for(var i=0; i<entityRecords.length; i++){
        for(var j=0; j<entityRecords[i].Records.length; j++){
            setSaveEntityRecord(entityRecords[i].EntityName, entityRecords[i].Records[j]);
        }
    }

    return saveEntityRecord;
};

// 给新增记录创建id，并对其子实体关联父实体的字段赋值
// 传参与返回格式相同：
// {Insert: {'EntityName1': records1, 'EntityName1': records1, ...},
//  Update: {'EntityName1': records1, 'EntityName1': records1, ...},
//  Delete: {'EntityName1': records1, 'EntityName1': records1, ...}}
var setInsertRecordId = function(entityRecords){
    var creatRecordId = function(entity, record){
        var oldId = record._id;
        record.OriginalId = oldId;
        if(record._id == null || record._id == undefined || record._id.constructor === Number){
            record._id = mongoose.Types.ObjectId();
        }
        
        // 设置子实体关联字段为父实体的id
        if(entity.Childs.length > 0){
            for(var i=0; i<entity.Childs.length; i++){
                var childEntity = entity.Childs[i];
                if(entityRecords.Insert[childEntity.EntityName]){
                    for(var j=0; j<entityRecords.Insert[childEntity.EntityName].length; j++){
                        if(entityRecords.Insert[childEntity.EntityName][j][childEntity.ParentField] == oldId){
                            entityRecords.Insert[childEntity.EntityName][j][childEntity.ParentField] = record._id;
                        }
                    }
                }
            }
        }
        return record;
    };

    //给新增记录赋id值，并对其子实体关联父实体的字段赋值
    if(entityRecords.Insert){
        for(var entityName in entityRecords.Insert){
            var entity = entityCollection.getEntity(entityName);
            for(var i=0; i<entityRecords.Insert[entityName].length; i++){
                entityRecords.Insert[entityName][i] = creatRecordId(entity, entityRecords.Insert[entityName][i]);
            }
        }
    }
    return entityRecords;
};

// 添加关联操作的数据
// 传参与返回(Promise)格式相同：
// {Insert: {'EntityName1': records1, 'EntityName1': records1, ...},
//  Update: {'EntityName1': records1, 'EntityName1': records1, ...},
//  Delete: {'EntityName1': records1, 'EntityName1': records1, ...}}
var addRelation = function(entityRecords){
    return new Promise(function(resolve, reject) {
        var deletePromises = [];

        var isRecordExist = function(entity, record){
            if(entityRecords.Delete.hasOwnProperty(entity.EntityName)){
                var records = entityRecords.Delete[entity.EntityName];
                if(records != null && records.length > 0){
                    for(var i=0; i<records.length; i++){
                        if(records[i]._id == record._id){
                            return true;
                        }
                    }
                    return false;
                }
                else{
                    return false;
                }
            }
            else{
                return false;
            }
        };

        // 删除主实体，关联删除所有子实体
        if(entityRecords.Delete){
            for(var entityName in entityRecords.Delete){
                var entity = entityCollection.getEntity(entityName);
                if(entity.Childs.length > 0){
                    deletePromises.push(findChilds(entity, entityRecords.Delete[entityName]));
                }
            }
        }

        if(deletePromises.length > 0){
            Promise.all(deletePromises).then(function(datass){
                // 检查要级联删除的数据是否已经在提交保存的数据里面，没有添加在删除记录集合里面
                for(var i=0; i<datass.length; i++){
                    if(datass[i] != null && datass[i].length > 0){
                        for(var j=0; j<datass[i].length; j++){
                            datass[i][j].Records.forEach(function(record){
                                var isExist = isRecordExist(datass[i][j].Entity, record);
                                if(!isExist){
                                    if(!entityRecords.Delete.hasOwnProperty(datass[i][j].Entity.EntityName)){
                                        entityRecords.Delete[datass[i][j].Entity.EntityName] = [];
                                    }
                                    record.RowStatus = BaseEnum.RowStatus.Delete.Value;
                                    entityRecords.Delete[datass[i][j].Entity.EntityName].push(record);
                                }
                            });
                        }
                    }
                }

                resolve(entityRecords);
            }).catch(function(err){
                reject(err);
            });
        }
        else{
            resolve(entityRecords);
        }
    });
};

exports.BatchSaveByTran = function(entityRecords, resultHandel){
    var saveEntityRecords = recordClassify(entityRecords);
    saveEntityRecords = setInsertRecordId(saveEntityRecords);

    if(resultHandel){
        addRelation(saveEntityRecords).then(function(entityRecords){
            var batchEntity = new BatchEntity(entityRecords);
            return batchEntity.save();         
        }).then(function(data){
            resultHandel(null, data);
        }).catch(function(err){
            resultHandel(err);
        });
    }
    else{
        return addRelation(saveEntityRecords).then(function(entityRecords){
            var batchEntity = new BatchEntity(entityRecords);
            return batchEntity.save();         
        });
    }
};

// 持久化数据
var BatchEntity = function(saveEntityRecords){
    this.SaveEntityRecords = {
        Insert: [],
        Update: [],
        Delete: []
    };
    // 将持久化实体排序
    // 删除应该是子实体在前，主实体在后
    var deleteRecords = [[],[],[],[],[],[],[],[],[],[]];
    for(var entityName in saveEntityRecords.Delete){
        var entity = entityCollection.getEntity(entityName);
        var records =  saveEntityRecords.Delete[entityName];
        var level = this.getEntityLevel(entity);

        deleteRecords[level].push({
            Entity: entity,
            Records: records
        });
    }
    this.SaveEntityRecords.Delete = deleteRecords;

    // 更新先更新子再更新主
    var updateRecords = [[],[],[],[],[],[],[],[],[],[]];
    for(var entityName in saveEntityRecords.Update){
        var entity = entityCollection.getEntity(entityName);
        var records =  saveEntityRecords.Update[entityName];
        var level = this.getEntityLevel(entity);

        updateRecords[level].push({
            Entity: entity,
            Records: records
        });
    }
    this.SaveEntityRecords.Update = updateRecords;

    // 插入应该是主实体先插入，子实体后插入
    var insertRecords = [[],[],[],[],[],[],[],[],[],[]];
    for(var entityName in saveEntityRecords.Insert){
        var entity = entityCollection.getEntity(entityName);
        var records =  saveEntityRecords.Insert[entityName];
        var level = this.getEntityLevel(entity);

        insertRecords[level].push({
            Entity: entity,
            Records: records
        });
    }
    this.SaveEntityRecords.Insert = insertRecords;
    
    this.RollbackData = {
        Insert: {},
        Update: {},
        Delete: {}
    };
    this.ReturnData = {
        Insert: {},
        Update: {},
        Delete: {}
    };
}
BatchEntity.prototype = {
    getEntityLevel: function(entity){
        var level = 0;
        while(entity.Parent != null){
            level++;
            entity = entity.Parent;
            // 到第9层不让继续，预计程序设计有问题，可能设计为死循环
            if(level == 9){
                break;
            }
        }
        return level;
    },
    // {Data: record}
    delete: function(entity, record){
        var self = this;
        return new Promise(function(resolve, reject) {
            entity.delete(record, function(err, data){
                if(err){
                    resolve({Err: err});
                }
                else{
                    // 设置回滚数据
                    if(!self.RollbackData.Insert.hasOwnProperty(entity.EntityName)){
                        self.RollbackData.Insert[entity.EntityName] = [];
                    }
                    self.RollbackData.Insert[entity.EntityName].push(data.OriginalData);
                    // 设置返回数据
                    if(!self.ReturnData.Delete.hasOwnProperty(entity.EntityName)){
                        self.ReturnData.Delete[entity.EntityName] = [];
                    }
                    delete data.OriginalData;
                    self.ReturnData.Delete[entity.EntityName].push(data);

                    resolve({Data: data});
                }
            });
        });
    },
    // {Data: {Entity: entity, Records: records}}
    deletes: function(entity, records){
        var self = this;
        return new Promise(function(resolve, reject) {
            var promises = [];
            for(var i=0; i<records.length; i++){
                promises.push(self.delete(entity, records[i]));
            }
            var result = {Data: {Entity: entity, Records:[]}};
            if(promises.length > 0){
                Promise.all(promises).then(function(datas){
                    var isErr = false;                    
                    for(var i=0; i<datas.length; i++){
                        if(datas[i].Err){
                            isErr = true;
                            resolve(datas[i]);
                            break;
                        }
                        else{
                            result.Data.Records.push(datas[i].Data);
                        }
                    }
                    if(!isErr){
                        resolve(result);
                    }
                }).catch(function(err){
                    resolve({Err: err});
                });
            }
            else{
                resolve(result);
            }
        });
    },
    // {Data: [{Entity: entity, Records: records} ...]}
    // 先删除子，再删除主
    deleteEntityRecords: function(entityRecords){
        var self = this;
        var getFindLevel = function(level){
            var findLevel = level;
            while(findLevel >=0 && entityRecords[findLevel].length == 0){
                findLevel--;
            }
            return findLevel;
        };
        var deleteLevelRecords = function(level){
            return new Promise(function(resolve, reject) {
                var promises = [];
                var findLevel = getFindLevel(level);

                if(findLevel >= 0){
                    for(var i=0; i<entityRecords[findLevel].length; i++){
                        var entity = entityRecords[findLevel][i].Entity;
                        var records = entityRecords[findLevel][i].Records;
                        promises.push(self.deletes(entity, records));
                    }

                    var result = {Data: []};
                    Promise.all(promises).then(function(datas){
                        var isErr = false;                    
                        for(var i=0; i<datas.length; i++){
                            if(datas[i].Err){
                                isErr = true;
                                reject(datas[i].Err);
                                break;
                            }
                            else{
                                result.Data.push(datas[i].Data);
                            }
                        }
                        if(!isErr){
                            findLevel--;
                            findLevel = getFindLevel(findLevel);
                            if(findLevel >= 0){
                                deleteLevelRecords(findLevel).then(function(datas){
                                    if(datas.Err) {
                                        reject(datas.Err);
                                    }
                                    else {
                                        result = {Data: datas.Data.concat(result.Data)};
                                        resolve(result);
                                    }
                                }).catch(function(err){
                                    reject(err);
                                });
                            }
                            else{
                                resolve(result);
                            }
                        }
                    }).catch(function(err){
                        reject(err);
                    });
                }
                else{
                    resolve({Data: []});
                }
            });
        };
        return deleteLevelRecords(entityRecords.length - 1);
    },
    // {Data: record}
    update: function(entity, record){
        var self = this;
        return new Promise(function(resolve, reject) {
            entity.update(record, function(err, data){
                if(err){
                    resolve({Err: err});
                }
                else{
                    // 设置回滚数据
                    if(!self.RollbackData.Update.hasOwnProperty(entity.EntityName)){
                        self.RollbackData.Update[entity.EntityName] = [];
                    }
                    self.RollbackData.Update[entity.EntityName].push(data.OriginalData);
                    // 设置返回数据
                    if(!self.ReturnData.Update.hasOwnProperty(entity.EntityName)){
                        self.ReturnData.Update[entity.EntityName] = [];
                    }
                    delete data.OriginalData;
                    self.ReturnData.Update[entity.EntityName].push(data);

                    resolve({Data: data});
                }
            });
        });
    },
    // {Data: {Entity: entity, Records: records}}
    updates: function(entity, records){
        var self = this;
        return new Promise(function(resolve, reject) {
            var promises = [];
            for(var i=0; i<records.length; i++){
                promises.push(self.update(entity, records[i]));
            }
            var result = {Data: {Entity: entity, Records:[]}};
            if(promises.length > 0){
                Promise.all(promises).then(function(datas){
                    var isErr = false;                    
                    for(var i=0; i<datas.length; i++){
                        if(datas[i].Err){
                            isErr = true;
                            resolve(datas[i]);
                            break;
                        }
                        else{
                            result.Data.Records.push(datas[i].Data);
                        }
                    }
                    if(!isErr){
                        resolve(result);
                    }
                }).catch(function(err){
                    resolve({Err: err});
                });
            }
            else{
                resolve(result);
            }
        });
    },
    // {Data: [{Entity: entity, Records: records} ...]}
    // 先修改子，再修改主
    updateEntityRecords: function(entityRecords){
        var self = this;

        var getFindLevel = function(level){
            var findLevel = level;
            while(findLevel >=0 && entityRecords[findLevel].length == 0){
                findLevel--;
            }
            return findLevel;
        };
        var updateLevelRecords = function(level){
            return new Promise(function(resolve, reject) {
                var promises = [];
                var findLevel = getFindLevel(level);

                if(findLevel >= 0){
                    for(var i=0; i<entityRecords[findLevel].length; i++){
                        var entity = entityRecords[findLevel][i].Entity;
                        var records = entityRecords[findLevel][i].Records;
                        promises.push(self.updates(entity, records));
                    }

                    var result = {Data: []};
                    Promise.all(promises).then(function(datas){
                        var isErr = false;                    
                        for(var i=0; i<datas.length; i++){
                            if(datas[i].Err){
                                isErr = true;
                                reject(datas[i].Err);
                                break;
                            }
                            else{
                                result.Data.push(datas[i].Data);
                            }
                        }
                        if(!isErr){
                            findLevel--;
                            findLevel = getFindLevel(findLevel);
                            if(findLevel >= 0){
                                updateLevelRecords(findLevel).then(function(datas){
                                    if(datas.Err) {
                                        reject(datas.Err);
                                    }
                                    else {
                                        result = {Data: datas.Data.concat(result.Data)};
                                        resolve(result);
                                    }
                                }).catch(function(err){
                                    reject(err);
                                });
                            }
                            else{
                                resolve(result);
                            }
                        }
                    }).catch(function(err){
                        reject(err);
                    });
                }
                else{
                    resolve({Data: []});
                }
            });
        };
        return updateLevelRecords(entityRecords.length - 1);
    },
    // {Data: record}
    insert: function(entity, record){
        var self = this;
        return new Promise(function(resolve, reject) {
            entity.insert(record, function(err, data){
                if(err){
                    resolve({Err: err});
                }
                else{
                    // 设置回滚数据
                    if(!self.RollbackData.Delete.hasOwnProperty(entity.EntityName)){
                        self.RollbackData.Delete[entity.EntityName] = [];
                    }
                    self.RollbackData.Delete[entity.EntityName].push(data);
                    // 设置返回数据
                    if(!self.ReturnData.Insert.hasOwnProperty(entity.EntityName)){
                        self.ReturnData.Insert[entity.EntityName] = [];
                    };

                    var returnD‌ata = Object.assign({}, data);
                    returnD‌ata.OriginalId = data.OriginalId;
                    self.ReturnData.Insert[entity.EntityName].push(returnD‌ata);

                    resolve({Data: data});
                }
            });
        });
    },
    // {Data: {Entity: entity, Records: records}}
    inserts: function(entity, records){
        var self = this;
        return new Promise(function(resolve, reject) {
            var promises = [];
            for(var i=0; i<records.length; i++){
                promises.push(self.insert(entity, records[i]));
            }
            var result = {Data: {Entity: entity, Records:[]}};
            if(promises.length > 0){
                Promise.all(promises).then(function(datas){
                    var isErr = false;                    
                    for(var i=0; i<datas.length; i++){
                        if(datas[i].Err){
                            isErr = true;
                            resolve(datas[i]);
                            break;
                        }
                        else{
                            result.Data.Records.push(datas[i].Data);
                        }
                    }
                    if(!isErr){
                        resolve(result);
                    }
                }).catch(function(err){
                    resolve({Err: err});
                });
            }
            else{
                resolve(result);
            }
        });
    },
    // {Data: [{Entity: entity, Records: records} ...]}
    // 先插入主，再插入子
    insertEntityRecords: function(entityRecords){
        var self = this;

        var getFindLevel = function(level){
            var findLevel = level;
            while(findLevel < entityRecords.length && entityRecords[findLevel].length == 0){
                findLevel++;
            }
            return findLevel;
        };
        var insertLevelRecords = function(level){
            return new Promise(function(resolve, reject) {
                var promises = [];
                var findLevel = getFindLevel(level);

                if(findLevel < entityRecords.length){
                    for(var i=0; i<entityRecords[findLevel].length; i++){
                        var entity = entityRecords[findLevel][i].Entity;
                        var records = entityRecords[findLevel][i].Records;
                        promises.push(self.inserts(entity, records));
                    }

                    var result = {Data: []};
                    Promise.all(promises).then(function(datas){
                        var isErr = false;                    
                        for(var i=0; i<datas.length; i++){
                            if(datas[i].Err){
                                isErr = true;
                                reject(datas[i].Err);
                                break;
                            }
                            else{
                                result.Data.push(datas[i].Data);
                            }
                        }
                        if(!isErr){
                            findLevel++;
                            findLevel = getFindLevel(findLevel);
                            if(findLevel < entityRecords.length){
                                insertLevelRecords(findLevel).then(function(datas){
                                    if(datas.Err) {
                                        reject(datas.Err);
                                    }
                                    else {
                                        result = {Data: datas.Data.concat(result.Data)};
                                        resolve(result);
                                    }
                                }).catch(function(err){
                                    reject(err);
                                });
                            }
                            else{
                                resolve(result);
                            }
                        }
                    }).catch(function(err){
                        reject(err);
                    });
                }
                else{
                    resolve({Data: []});
                }
            });
        };
        return insertLevelRecords(0);
    },
    save: function(){
        var self = this;
        return new Promise(function(resolve, reject) {
            self.deleteEntityRecords(self.SaveEntityRecords.Delete).then(function(datas){
                return self.updateEntityRecords(self.SaveEntityRecords.Update);
            }).then(function(datas){
                return self.insertEntityRecords(self.SaveEntityRecords.Insert);
            }).then(function(datas){
                resolve(self.ReturnData);
            }).catch(function(err){
                // 立即回滚
                self.rollback();
                reject(err);
            });
        });
    },
    rollback: function(){
        for(var entityName in this.RollbackData.Delete){
            var entity = entityCollection.getEntity(entityName);
            for(var i=0; i<this.RollbackData.Delete[entityName].length; i++){
                entity.Entity.remove({_id: this.RollbackData.Delete[entityName][i]._id}).exec();
            }
        }
        for(var entityName in this.RollbackData.Update){
            var entity = entityCollection.getEntity(entityName);
            for(var i=0; i<this.RollbackData.Update[entityName].length; i++){
                entity.Entity.update({_id: this.RollbackData.Update[entityName][i]._id}, {$set: this.RollbackData.Update[entityName][i]}, {overwrite: true}).exec();
            }
        }
        for(var entityName in this.RollbackData.Insert){
            var entity = entityCollection.getEntity(entityName);
            for(var i=0; i<this.RollbackData.Insert[entityName].length; i++){
                var newEntity = new entity.Entity(this.RollbackData.Insert[entityName][i]);
                newEntity.save();
            }
        }
    }
};