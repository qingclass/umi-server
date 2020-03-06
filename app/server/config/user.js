var entityCollection = require('../common/EntityCollection');

module.exports = function (app) {
    // 监听新增组织事件  判断是否是同步过来的
    var entity = entityCollection.getEntity("User");
    entity.addEventListener("Inserting", function () {
        let self = this;
        this.Code = this.Code+ '-----1'
    });
};




