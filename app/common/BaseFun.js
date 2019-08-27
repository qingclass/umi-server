let entityCollection = require('./EntityCollection'),
    mongoose  = require('mongoose');

exports.formatCondition = function(entityClass, condition, resultHandel){
    try{
        //获取字段对应的顶级属性条件
        var getFieldCondition = function(field, fieldCondition){
            var fields = field.split('.');
            var fieldEntity = null;   //被查找的实体，比如：Parent.Name，这里记录Parent所对应的Department实体
            var findEntitys = [];

            //找出字段对应的实体
            for(var i=0; i<fields.length; i++){
                if(i == 0){
                    fieldEntity = entityCollection.getEntity(entityClass.Fields[fields[0]].ref);
                }
                else{
                    findEntitys.push({
                        Entity: fieldEntity,
                        Field: fields[i]
                    });
                    //如果不是最后一个字段，都会有对应的实体
                    if(i != fields.length - 1){
                        fieldEntity = entityCollection.getEntity(fieldEntity.Fields[fields[i]].ref);
                    }
                }
            }

            //获取顶级属性对应的id集合条件
            var getFieldIds = function(entity, objCondition){
                return new Promise(function(resolve, reject) {
                    entity.Entity.find(objCondition).exec(function(err, records) {
                        if (err) {
                            var newErr = new Error();
                            newErr.leval = 5;
                            newErr.title = '【' + entity.Name + '】' + '查找错误';
                            newErr.message = err.message;
                            reject(newErr);
                        }
                        else {
                            var ids = [];
                            for (var j = 0; j < records.length; j++) {
                                ids.push(records[j]._id);
                            }
                            if(ids.length == 0){
                                ids = [null];
                            }

                            if(findEntitys.length > 0){
                                var findParameter = findEntitys.splice(findEntitys.length - 1, 1)[0];
                                findWhere = {};
                                findWhere[findParameter.Field] = {$in: ids};
                                getFieldIds(findParameter.Entity, findWhere).then(function(data){
                                    resolve(data);
                                }).catch(err => reject(err));
                            }
                            else{
                                resolve({$in: ids});
                            }
                        }
                    });
                });
            };

            var findParameter = findEntitys.splice(findEntitys.length - 1, 1)[0];
            var findWhere = {};
            findWhere[findParameter.Field] = fieldCondition;

            return getFieldIds(findParameter.Entity, findWhere);
        };

        //将条件进行格式化，将传过来的正则表达式字符串转换为正则表达式
        var regexCondition = function(condition){
            // for(var p in condition){
            //     if(condition[p] != null) {
            //         if (condition[p].constructor == String) {
            //             if (condition[p].search(/^\/.*\/$/) > -1) {
            //                 condition[p] = new RegExp(condition[p].substring(1, condition[p].length - 1));
            //             }
            //         }
            //         else if (condition[p].constructor == Array) {
            //             for(var i=0; i<condition[p].length; i++){
            //                 condition[p][i] = regexCondition(condition[p][i]);
            //             }
            //         }
            //         else if (condition[p].constructor == Object) {
            //             condition[p] = regexCondition(condition[p]);
            //         }
            //     }
            // }

            return condition;
        };

        var promises = [];
        //遍历所有属性，将多级查询改为顶级属性对应的查询
        var getCondition = function(entityClass, condition){
            for(var p in condition) {
                var fieldAttributes = p.split('.');
                if(fieldAttributes.length > 1) {
                    promises.push(new Promise(function(resolve, reject) {
                        let property = p;
                        let field = fieldAttributes[0];
                        getFieldCondition(property, condition[p]).then(function(data){
                            delete condition[property];
                            condition[field] = data;
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        })
                    }));
                }
                else{
                    if(condition[p] != null) {
                        if (condition[p].constructor == Array) {
                            for(var i=0; i<condition[p].length; i++){
                                if(condition[p][i].constructor == Object){
                                    getCondition(entityClass, condition[p][i]);
                                }
                            }
                        }
                    }
                }
            }
        };

        getCondition(entityClass, condition);

        Promise.all(promises).then(function(data){
            resultHandel(null, condition)
        }).catch(function(err){
            resultHandel({
                leval: 5,
                title: '数据库条件错误',
                message: "详细信息：条件：" + condition.toString() + '转换出错'
            });
        });
    }
    catch(e){
        resultHandel({
            leval: 5,
            title: '数据库条件错误',
            message: "详细信息：" + e.message + "\n" + "条件：" + condition.toString()
        });
    }
};
exports.getObjectId = function(){
    return mongoose.Types.ObjectId();
}
exports.getGuid = function(){
    return exports.getObjectId().toString();
};