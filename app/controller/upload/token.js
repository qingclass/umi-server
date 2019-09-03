const express = require('express')
const qiniu = require('qiniu')
const Router = express.Router()
const config = require('../../../config/config')

const fs = require('fs')
const qn = require('qn')
// 空间名
const bucket = config.qiniu.Bucket
// 七牛云
const client = qn.create({
  accessKey: '_cj2UoipOyT-OQEPMrr05jWAjHO7A1h-dJPhPu8T',
  secretKey: 'Y0aRu6N8fjfsCyvQtPAieUaaw-H2Tl67uFXsoQrC',
  bucket: 'avatar-img-d',
  origin: 'http://pwdp80sdf.bkt.clouddn.com'
})

var mac = new qiniu.auth.digest.Mac(
  config.qiniu.AccessKey,
  config.qiniu.SecretKey
)
var config2 = new qiniu.conf.Config()
// 这里主要是为了用 node sdk 的 form 直传，结合 demo 中 form 方式来实现无刷新上传
config2.zone = qiniu.zone.Zone_z0
var formUploader = new qiniu.form_up.FormUploader(config2)
var putExtra = new qiniu.form_up.PutExtra()
var options = {
  scope: config.qiniu.Bucket,
  deleteAfterDays: 7,
  returnBody:
    '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}'
}

var putPolicy = new qiniu.rs.PutPolicy(options)
var bucketManager = new qiniu.rs.BucketManager(mac, null)

/*获取七牛云上传token*/
Router.post('/qiniu', function(req, res) {
  var token = putPolicy.uploadToken(mac)
  return res.json({
    success: true,
    token: token,
    domain: config.qiniu.Domain
  })
})

async function upToQiniu (filePath, key) {
  console.log('上传七牛');
  const accessKey = qiniuConfig.accessKey // 你的七牛的accessKey
  const secretKey = qiniuConfig.secretKey // 你的七牛的secretKey
  //生成一个上传的凭证
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
  //设置七牛的上传空间
  const options = {
    scope: qiniuConfig.scope // 你的七牛存储对象
  }
  const putPolicy = new qiniu.rs.PutPolicy(options)
  //生成上传的Token
  const uploadToken = putPolicy.uploadToken(mac)
  //实例化config
  const config = new qiniu.conf.Config()
  // 空间对应的机房
  config.zone = qiniu.zone.Zone_z0;
  const localFile = filePath
  const formUploader = new qiniu.form_up.FormUploader(config)
  const putExtra = new qiniu.form_up.PutExtra()
  // 文件上传
  return new Promise((resolved, reject) => {
    formUploader.putFile(uploadToken, key, localFile, putExtra, function (respErr, respBody, respInfo) {
      if (respErr) {
        reject(respErr)
      }
      if (respInfo.statusCode == 200) { 
        resolved(respBody)
      } else {
        resolved(respBody)
      }
    })
  })

}
Router.post('/upload', function(req, res) {
  let file = req.filePath.file;
  let rename = file.name;
  // let filePath = path.join(__dirname, '../downloads') + `/${rename}`;
  var token = upToQiniu(rename);
  return res.json({
    success: true,
    token: token,
    domain: config.qiniu.Domain
  })
})


module.exports = Router
