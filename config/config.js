module.exports = {
  // MongoDB配置
  dbConnect: 'mongodb://dev:dev123@118.24.237.163:27017/fancy',
  qiniu: {
    AccessKey: '_cj2UoipOyT-OQEPMrr05jWAjHO7A1h-dJPhPu8T',
    SecretKey: 'Y0aRu6N8fjfsCyvQtPAieUaaw-H2Tl67uFXsoQrC',
    Bucket: 'avatar-img-d',
    Port: 9000,
    UptokenUrl: 'avatar-img-d',
    Domain: 'pwdp80sdf.bkt.clouddn.com'
  },
  redis: 'redis://118.24.237.163:6379',
  REDIS_PRODECT_PREFIX: 'fancy',
}
