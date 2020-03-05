let entityCollection = require("./EntityCollection"),
  fs = require('fs'),
  mongoose = require("mongoose");

exports.formatCondition = function(entityClass, condition, resultHandel) {
  try {
    //获取字段对应的顶级属性条件
    var getFieldCondition = function(field, fieldCondition) {
      var fields = field.split(".");
      var fieldEntity = null; //被查找的实体，比如：Parent.Name，这里记录Parent所对应的Department实体
      var findEntitys = [];

      //找出字段对应的实体
      for (var i = 0; i < fields.length; i++) {
        if (i == 0) {
          fieldEntity = entityCollection.getEntity(
            entityClass.Fields[fields[0]].ref
          );
        } else {
          findEntitys.push({
            Entity: fieldEntity,
            Field: fields[i]
          });
          //如果不是最后一个字段，都会有对应的实体
          if (i != fields.length - 1) {
            fieldEntity = entityCollection.getEntity(
              fieldEntity.Fields[fields[i]].ref
            );
          }
        }
      }

      //获取顶级属性对应的id集合条件
      var getFieldIds = function(entity, objCondition) {
        return new Promise(function(resolve, reject) {
          entity.Entity.find(objCondition).exec(function(err, records) {
            if (err) {
              var newErr = new Error();
              newErr.leval = 5;
              newErr.title = "【" + entity.Name + "】" + "查找错误";
              newErr.message = err.message;
              reject(newErr);
            } else {
              var ids = [];
              for (var j = 0; j < records.length; j++) {
                ids.push(records[j]._id);
              }
              if (ids.length == 0) {
                ids = [null];
              }

              if (findEntitys.length > 0) {
                var findParameter = findEntitys.splice(
                  findEntitys.length - 1,
                  1
                )[0];
                findWhere = {};
                findWhere[findParameter.Field] = { $in: ids };
                getFieldIds(findParameter.Entity, findWhere)
                  .then(function(data) {
                    resolve(data);
                  })
                  .catch(err => reject(err));
              } else {
                resolve({ $in: ids });
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
    var regexCondition = function(condition) {
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
    var getCondition = function(entityClass, condition) {
      for (var p in condition) {
        var fieldAttributes = p.split(".");
        if (fieldAttributes.length > 1) {
          promises.push(
            new Promise(function(resolve, reject) {
              let property = p;
              let field = fieldAttributes[0];
              getFieldCondition(property, condition[p])
                .then(function(data) {
                  delete condition[property];
                  condition[field] = data;
                  resolve(true);
                })
                .catch(function(err) {
                  reject(err);
                });
            })
          );
        } else {
          if (condition[p] != null) {
            if (condition[p].constructor == Array) {
              for (var i = 0; i < condition[p].length; i++) {
                if (condition[p][i].constructor == Object) {
                  getCondition(entityClass, condition[p][i]);
                }
              }
            }
          }
        }
      }
    };

    getCondition(entityClass, condition);

    Promise.all(promises)
      .then(function(data) {
        resultHandel(null, condition);
      })
      .catch(function(err) {
        resultHandel({
          leval: 5,
          title: "数据库条件错误",
          message: "详细信息：条件：" + condition.toString() + "转换出错"
        });
      });
  } catch (e) {
    resultHandel({
      leval: 5,
      title: "数据库条件错误",
      message: "详细信息：" + e.message + "\n" + "条件：" + condition.toString()
    });
  }
};
exports.getObjectId = function() {
  return mongoose.Types.ObjectId();
};
exports.getGuid = function() {
  return exports.getObjectId().toString();
};

exports.getClientIP = function(req) {
  return (
    req.headers["x-forwarded-for"] || // 判断是否有反向代理 IP
    req.connection.remoteAddress || // 判断 connection 的远程 IP
    req.socket.remoteAddress || // 判断后端的 socket 的 IP
    req.connection.socket.remoteAddress
  );
};

exports.log = function(logType = 1, title, msg, strUser){
    var strMsg;
    var nowDate = new Date();
    var fileFullName;
    var fileName = nowDate.getFullYear() +
        '.' + (nowDate.getMonth() + 1 < 10 ? '0' + (nowDate.getMonth() + 1).toString() : (nowDate.getMonth() + 1).toString()) +
        '.' + (nowDate.getDate() < 10 ? '0' + nowDate.getDate().toString() : nowDate.getDate().toString());

    strMsg = (nowDate.getHours().toString().length == 1 ? '0' + nowDate.getHours().toString() : nowDate.getHours().toString()) +
        ":" + (nowDate.getMinutes().toString().length == 1 ? '0' + nowDate.getMinutes().toString() : nowDate.getMinutes().toString()) +
        ":" + (nowDate.getSeconds().toString().length == 1 ? '0' + nowDate.getSeconds().toString() : nowDate.getSeconds().toString());

    if(strUser != undefined && strUser.trim() != ''){
        strMsg += ' 【' + strUser + '】';
    }

    if(logType == 1){
        fileFullName = './logs/error/' + fileName + '.log';
        strMsg += '\r\n标题：' + title + '\r\n' + '错误信息：' + msg + '\r\n\r\n';
    }
    else if(logType == 2){
        fileFullName = './logs/access/' + fileName + '.log';
        strMsg += '\r\n标题：' + title + '\r\n' + '访问信息：' + msg + '\r\n\r\n';
    }
    else if(logType == 3){
        fileFullName = './logs/execute/' + fileName + '.log';
        strMsg += '\r\n标题：' + title + '\r\n' + '执行信息：' + msg + '\r\n\r\n';
    }
    else{
        return;
    }

    fs.exists(fileFullName, function(isExist){
        if(isExist){
            fs.appendFile(fileFullName, strMsg, function(err, data) {
                if(err) {
                    console.log('日志文件追加信息出错【' + strUser + '】:' + '\r\n' + err.toString());
                }
            });
        }
        else{
            fs.writeFile(fileFullName, strMsg, function(err, data) {
                if(err) {
                    console.log('创建访问日志文件出错【' + strUser + '】:' + '\r\n' + err.toString());
                }
            });
        }
    });
};
