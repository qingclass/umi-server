let entityCollection = require('./EntityCollection');
let Transaction = require('./BatchEntity');

function find(condition, orderby, populate, entityName) {
    return new Promise(function(resolve,reject){
        let entity = entityCollection.getEntity(entityName);
        entity.find(condition, orderby, populate, function(err, records) {
            if (err) {
                reject(err);
            } else {
                resolve(records);
            }
        });
    })
};

exports.find = find;

function findOne(condition, populate, entityName) {
    return new Promise(function(resolve,reject){
        let entity = entityCollection.getEntity(entityName);
        entity.findOne(condition, populate, function(err, record) {
            if (err) {
                reject(err);
            } else {
                resolve(record);
            }
        });
    })
};
exports.findOne = findOne;
exports.updateEntity = function(newRecord, entityName) {
   return new Promise(function(resolve,reject){
    let entity = entityCollection.getEntity(entityName);
    entity.update(newRecord, function(err, doc) {
        if (err) {
            reject(err);
        } else {
            resolve(doc);
        }
    });
   })
    
};
/**
 * 事务处理
 * @param {记录集合} array 
 */
function transactionSave(array) {
    return new Promise(function(resolve,reject){
        Transaction.BatchSaveByTran(array, function(err, result) {
            if (err) {
                let newErr = new Error();
                newErr.level = 9;
                newErr.title = '批量操作';
                newErr.message = err.message;
                reject(newErr);
            }
            resolve(result);
        });
    })
};
/**
 * 事务处理
 * @param {记录集合} array 
 */
exports.transactionSave = transactionSave;