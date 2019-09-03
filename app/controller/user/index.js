const express = require('express')
const utils = require('utility') // md5加密算法
const Router = express.Router()
const User = require('../../models/user.js')
let CommonController = require('../../common/index')
let entityCollection = require('../../common/EntityCollection')


Router.post('/updateByValue', function(req, res) {
  const body = req.body;
  let User = entityCollection.getEntity('users');
  User.updateByValue(
    {_id:req.session.userName},
    { sex: body.sex, avatar: body.avatar },
    function(err, doc) {
      return res.json({ code: 0, doc })
    }
  )
})

// 注册
Router.post('/register', function(req, res) {
  const { user, pwd } = req.body
  let User = entityCollection.getEntity('users');
  User.findOne({ user:user }, null,function(err, doc) {
    if (doc) {
      return res.json({ code: 1, msg: '用户已存在' })
    }
    User.insert({
      user:user,
      pwd: md5Pwd(pwd)
    },function(e, d) {
      if (e) {
        console.log('e', e)
        return res.json({ code: 1, msg: '后端出错了' })
      }
      const { user, _id } = d
      return res.json({ code: 0, data: { user, _id } })
    })
  })
})

// 登录
Router.post('/login',async function(req, res) {
  const { user, pwd } = req.body;
  let User = entityCollection.getEntity('users');
  User.findOne(
    { user:user },
    null,
    function(err, doc) {
      if (!doc) {
        return res.json({ code: 1, msg: '用户不存在' })
      }
      if (md5Pwd(pwd) == doc.pwd) {
        req.session.userName = doc._id
        return res.json({
          code: 0,
          result: {
            carts: doc.carts,
            userInfo: { user: doc.user, avatar: doc.avatar },
            address: doc.address.filter(item => item.checked)
          }
        })
      } else {
        return res.json({ code: 1, msg: '密码错误' })
      }
    }
  )
})

// 登出
Router.post('/logout', function(req, res) {
  req.session.userName = null
  return res.json({ code: 1, msg: '已退出登录' })
})

//  获取所有用户
Router.get('/all', function(req, res) {
  let User = entityCollection.getEntity('users');
  User.find({},null,null,function(err, item) {
    if (err) {
      res.json({ code: 0, msg: '后端出错' })
    } else {
      res.json({ code: 1, result: item })
    }
  })
})
// 获取信息
Router.get('/userInfo', function(req, res) {
  let User = entityCollection.getEntity('users');
  User.findOne({ _id:req.session.userName }, null, function(err, doc) {
    if (err) {
      return res.json({ code: 1, msg: '后端出错了' })
    }
    if (doc) {
      return res.json({ code: 0, result: doc })
    }
  })
})

// 删除
Router.post('/delete', function(req, res) {
  User.remove({ _id: req.body.id }, function(err, doc) {
    return res.json({ code: 0, msg: '删除成功' })
  })
})

function md5Pwd(pwd) {
  const salt = 'fancy_store_3987!~@xxx'
  return utils.md5(utils.md5(pwd + salt))
}

module.exports = Router
