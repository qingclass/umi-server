const express = require('express')
const app = express()
const glob = require('glob')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const redisStore = require('connect-redis')(session)
const redis = require('./config/redis').redis
const cors = require('cors')
const path = require('path')
const router = require('./router/index.js')
const authMiddleWare = require('./app/middleware/auth')
const loginMiddleWare = require('./app/middleware/login')
app.use(cookieParser('fancystore'))
app.use(
  session({
    // store: new redisStore({
    //   client: redis,
    //   prefix: 'fancystore'
    // }),
    secret: 'fancystore',
    name: 'fancystore_id', // 保存在cookie的一个名字，默认为connect.sid可以不设置
    resave: false, // 强制保存session即使它并没有变化，默认为true,建议设置成false
    saveUninitialized: true, //建议将未初始化的session存储，默认值为true,建议设置成true
    cookie: {
      path: '/',
      httpOnly: true,
      // domain: 'fancystore.cn',
      maxAge: 60 * 10000
    }
    // rolling:true, // 持续刷新过期时间，只有持续不刷新会生效
  })
)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(
  cors({
    origin: [
      'http://localhost:8080',
    ],
    credentials: true,
    maxAge: '1728000'
  })
)
app.use(loginMiddleWare)
app.use(authMiddleWare)

app.use(router)
app.use(function(err, req, res, next) {
  res.status(404)
  console.log('Error Happends ******', err.stack)
})

//加载所有模型
let files = glob.sync('./app/models/*.js');
files.forEach(function (modelPath) {
  require(path.resolve(modelPath));
});
//加载所有的模型监控Inserting  Updateing Deleteing  Inserted Updated Deleted
let addfiles = glob.sync('./app/common/services/*.js');
addfiles.forEach(function (modelPath) {
  require(path.resolve(modelPath));
});


app.listen(9093, function() {
  console.log('Node app start at port 9093')
})
