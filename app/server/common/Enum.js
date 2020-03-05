//记录状态
module.exports.RowStatus = {
    UnChange: { Value: 0, Text: '未改变' },
    Insert: { Value: 1, Text: '插入' },
    Delete: { Value: 2, Text: '删除' },
    Modify: { Value: 3, Text: '修改' }
};

//提示信息类型
module.exports.LogType = {
    Error: { Value: 0, Text: '错误' },
    Access: { Value: 1, Text: '访问' },
    Execute: { Value: 2, Text: '执行' }
};

//提示信息类型
module.exports.InfoType = {
    Info: { Value: 0, Text: '信息' },
    Alert: { Value: 1, Text: '警告' }
};

//事务状态
module.exports.TransactionState = {
    Initial: { Value: 0, Text: '初始化' },
    Pending: { Value: 1, Text: '等待' },
    Committed: { Value: 2, Text: '提交' },
    Done: { Value: 3, Text: '完成' },
    Canceling: { Value: 4, Text: '取消' }
};

//控件类型
module.exports.ControllType = {
    TextBox: { Value: 0, Text: '文本' },
    CheckBox: { Value: 1, Text: '复选' },
    NumberBox: { Value: 2, Text: '数值' },
    PercentBox: { Value: 3, Text: '百分比' },
    DropDownList: { Value: 4, Text: '下拉' },
    Refer: { Value: 5, Text: '参照' },
    Calendar: { Value: 6, Text: '日历' }
};

//值类型
module.exports.ValueType = {
    String: { Value: 0, Text: '文本' },
    Number: { Value: 1, Text: '数值' },
    Percent: { Value: 2, Text: '百分比' },
    Boolean: { Value: 3, Text: '布尔' },
    Date: { Value: 4, Text: '日期' },
    Enum: { Value: 5, Text: '枚举' }
};

//字段类型
module.exports.FieldType = {
    String: { Value: 0, Text: '文本' },
    Number: { Value: 1, Text: '数值' },
    Boolean: { Value: 2, Text: '布尔' },
    Date: { Value: 3, Text: '日历' },
    Enum: { Value: 4, Text: '枚举' },
    Refer: { Value: 5, Text: '实体' },
    Array: { Value: 6, Text: '数组' }
};

//舍入类型
module.exports.RoundType = {
    // Empty: {Value: 0, Text: ''},
    // AllAdd: { Value: 0, Text: '全部进位' },
    // AllDelete: { Value: 1, Text: '全部舍位' },
    // AccondValueRound: { Value: 2, Text: '按值舍入' }

    // Empty: { Value: 0, Text: '' },
    AllAdd: { Value: 1, Text: '全部进位' },
    AllDelete: { Value: 2, Text: '全部舍位' },
    AccondValueRound: { Value: 3, Text: '按值舍入' }
}

//日期格式
module.exports.DateTimeFormat = {
    DateTime: { Value: 0, Text: '日期时间' },
    Date: { Value: 1, Text: '日期' }
};