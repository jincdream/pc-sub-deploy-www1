/**
 * deploy 插件接口
 * @param  {Object}   options  插件配置
 * @param  {Object}   modified 修改了的文件列表（对应watch功能）
 * @param  {Object}   total    所有文件列表
 * @param  {Function} next     调用下一个插件
 * @return {undefined}
 */


 'use strict';
 var https   = require('https');
 var http    = require('http');
 var iconv   = require('iconv-lite');
 var qs      = require('querystring');
 var url     = require('url');
 var util    = require('util');
 var mime    = require('mime');
 var path    = require('path');
 var tunnel  = require('./tunnel.js');
 var shell   = require('child_process').exec;

 var fs = require('fs');

 var FormData = require('form-data')
 var request  = require('request')

 var form = new FormData()

 //代理
 var proxy = !0
 var proxyServer = {
   host: '192.168.11.254',
   port: 8080
 }
 var tunnelingAgent = tunnel.httpsOverHttp({
   proxy: proxyServer,
   rejectUnauthorized:false,
   requestCert:true
 })
 var _httpProxyOp = function(option){
   option.host = proxyServer.host
   option.port = proxyServer.port
   return option
 }
 var _httpsProxyOp = function(option){
   option.agent = tunnelingAgent
   return option
 }

 var fixOpHttp = function(option){
   return option
 }
 var fixOpHttps = function(option){
   return option
 }

 if(proxy){
   fixOpHttp = _httpProxyOp
   fixOpHttps = _httpsProxyOp
 }
 //代理end
 var session = !1
 var loggind = !1


 var uploadToWWW1 = function(site,username,password,path,files){
   
   var rzUrl = 'http://www1.'+ site +'.com.cn' + path + 'index.html'

   var requestURL  = 'https://219.136.245.112/security-server/auth.do'
   var postContent = qs.stringify({
    app: 'upload_' + site,
    "return": 'http://cms.' + site + '.com.cn:8080/' + site + '/Security?dispatch =login',
    username: username,
    password: password
   })
   var headers    = {
     'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
     'Content-Type':'application/x-www-form-urlencoded',
     'Origin':'http://cms.'+site+'.com.cn:8080',
     'Referer':'http://cms.'+site+'.com.cn:8080/'+site+'/Security?dispatch=login',
     'Upgrade-Insecure-Requests':'1',
     'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.130 Safari/537.36',
     'Content-Length': postContent.length
   }

   var loginOption = fixOpHttps({
     hostname: '219.136.245.112',
     port: 443,
     path: '/security-server/auth.do',
     method: 'POST',
     headers: headers,
     rejectUnauthorized:false,
     requestCert:true
   })

   new Promise(function getCookie(resolve, reject) {
    if(session)return resolve(session);
     var req = http.get('http://cms.'+ site +'.com.cn:8080/'+site+'/Security?dispatch=login',function(res){

      resolve(session = res.headers['set-cookie'][0])
     }).end()
   }).then(function(session){
     loginOption.headers.cookie = session
     // console.log(session,loginOption)
     return new Promise(function httpsLogin(_resolve, _reject) {
       var req = https.request(loginOption,function(res){
         _resolve(session)
       }).on('error',function(err){
         _reject(err)
       })
       req.write(postContent)
       req.end()
     });
   }).then(function(session){
     // console.log(location)
     var form_data = {
       dispatch:"upload",
       colId:"/",
       ulUser:username,
       siteId:"2",
       colIdNormal:"/",
       toDir:path,
       ulfile:files
     }

     return new Promise(function(resolve, reject) {
       // var c = fs.createWriteStream('./c.html')
       request.post({
           url:'http://cms.'+site+'.com.cn:8080/'+site+'/Upload',
           headers:{
             cookie:session
           },
           formData:form_data
         },function(err,res,body){
           if(err)reject(err)
           else resolve(body)
           // res.end()
       })
     })

   })
   .then(function(body){
     // fis.util.write('./index.html',body,'gbk')
     console.log(rzUrl)
     !loggind && shell('start ' + 'chrome' + ' "'+ rzUrl + '?t=' +(+new Date));
     loggind = !0
   }).catch(function(err){
     console.log(err)
   })
 }
 // uploadToWWW1()


mime.define({
 'application/x-zip-compressed':['zip']
})
module.exports = function(options, modified, total, next) {

  var formDataFiles =[]
  // [
  //   {
  //     value: fs.createReadStream('./cc.zip'),
  //     options: {
  //       filename:'cc.zip',
  //       contentType:'application/x-zip-compressed'
  //     }
  //   },
  //   {
  //     value: fs.createReadStream('./t.zip'),
  //     options: {
  //       filename:'t.zip',
  //       contentType:'application/x-zip-compressed'
  //     }
  //   }
  // ]

  modified.forEach(function(file,i){
    var filename    = file.basename
    var patch       = file.getHashRelease()
    var contentType = mime.lookup(filename)
    var content     = file.getContent()
    var output      = fis.get('outputDir')
    var realPath    = path.join(output,patch)
    var readSream   = new Buffer(content)
    formDataFiles.push({
      value: readSream,
      options:{
        filename: filename,
        contentType: contentType
      }
    })
    // var readSream = new stream.Readable
    // readSream.push()
    console.log(filename)
  })
  uploadToWWW1(options.site,options.user.username,options.user.password,options.path,formDataFiles)






    next(); //由于是异步的如果后续还需要执行必须调用 next
};
