const express = require('express');
const request = require("request");
const app = express()
var auth = require('./lib/auth');
var jwt = require('jsonwebtoken');

//database 연결 설정
var mysql = require("mysql");
var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "daydream915",
    database: "fintech1019",
  });
connection.connect();

//뷰 파일이 있는 디렉토리 저장
app.set('views', __dirname + '/views');
//여러 가지 뷰 엔진 중에서 ejs를 사용한다는 선언
app.set('view engine', 'ejs');

//JSON 형태의 데이터 전송을 허용한다
app.use(express.json());
//urlencoded 형식의 데이터 전송을 허용한다
app.use(express.urlencoded({ extended: false }));
//정적 파일(디자인, 플러그인 등)들을 사용하기 위한 폴더 설정
app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
    res.send('Hello World')
})

app.get('/signup', function(req, res) {
    res.render('signup');
})

app.get('/login', function(req, res) {
    res.render('login');
})

app.get('/authTest', auth, function(req, res) {
    console.log(req.decoded);
    res.json("로그인 성공. / 컨텐츠를 볼 수 있습니다.")
})

app.get('/main', function(req, res) {
    res.render('main');
})

app.get('/balance', function(req, res) {
    res.render('balance');
})

app.get('/transactionlist', function(req, res) {
    res.render('transactionlist');
})

app.get('/authResult', function(req, res) {
    var authCode = req.query.code;
    console.log(authCode);
    var option = {
        method: "POST",
        url: "https://testapi.openbanking.or.kr/oauth/2.0/token",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json
        form: {
            code: authCode,
            client_id: "6KySn1iYFgMX2t1HtlmXNltsVaMQ7uLouG7byIC5",
            client_secret: "7aGfzkk9SJGSQ1WwhSbHfXpoOe0IuDV3Pu3Pyn80",
            redirect_uri: "http://localhost:3000/authResult",
            grant_type: "authorization_code"
            //본인 Secret Key로 변경
        },
    };
    request(option, function(err, response, body) {
        var accessRequestResult = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
        console.log(accessRequestResult);
        res.render("resultChild", { data: accessRequestResult }); //data 이름으로 resultChild에 데이터 전달
    })
})

app.post('/signup', function(req, res) {
    var userName = req.body.userName;
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;
    var userAccessToken = req.body.userAccessToken;
    var userRefreshToken = req.body.userRefreshToken;
    var userSeqNo = req.body.userSeqNo;

    var userInsertSql = "INSERT INTO user (`name`, `email`, `password`, `accesstoken`, `refreshtoken`, `userseqno`) VALUES (?, ?, ?, ?, ?, ?);"

    connection.query(userInsertSql, [userName, userEmail, userPassword, userAccessToken, userRefreshToken, userSeqNo], function (error, results, fields) {
        if (error) throw error;
        else {
            res.json(1);
        }
      });

    console.log(req.body);
})

app.post('/login', function(req, res) {
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;

    var userCheckSql = "SELECT * FROM user WHERE email=?"
    connection.query(userCheckSql, [userEmail], function (error, results, fields) {
        if (error) throw error;
        else {
          if(results.length == 0) {
              res.json(2);
          }
          else {
              var storedPassword = results[0].password;
              if(userPassword == storedPassword) {
                var tokenKey = "fintech1234!" //토큰 키 추가
                //로그인 성공
                jwt.sign(
                    {
                      userId: results[0].id,
                      userEmail: results[0].email,
                    },
                    tokenKey,
                    {
                      expiresIn: "1d",
                      issuer: "fintech.admin",
                      subject: "user.login.info",
                    },
                    function (err, token) {
                      console.log("로그인 성공", token);
                      res.json(token);
                    }
                  );
              }
              else {
                //로그인 실패
                res.json(2);
              }
          }
        }
     });
});

app.post('/list', auth, function(req, res) {
    var userId = req.decoded.userId;
    var userSearchSql = "SELECT * FROM user WHERE id=?";
    //토큰에 담겨있는 사용자 정보
    //{ "userId" : 12,
    //  "userEmail":
    //  "iat":
    //  "exp":
    //  "iss":
    //  "sub":
    //}

    connection.query(userSearchSql, [userId], function(err, results) {
        if(err) throw err;
        else {
            var option = {
                method: "GET",
                url: "https://testapi.openbanking.or.kr/v2.0/user/me",
                headers: {
                    "Authorization": "Bearer " + results[0].accesstoken
                },
                //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json
                qs: {
                    user_seq_no: results[0].userseqno
                },
            };
            request(option, function(err, response, body) {
                var listDataResult = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
                console.log(listDataResult);
                res.json(listDataResult)
            }) 
        }
    })
})

app.post('/balance', auth , function(req, res){
    var userId = req.decoded.userId;
    var finusenum = req.body.fin_use_num;
    console.log("finusenum : " + finusenum)
    //데이터베이스에 사용자 Accesstoken , 조회 후
    //금융위 API 잔액 조회 요청 만들고 데이터 그대로 response하기
    var userSearchSql = "SELECT * FROM user WHERE id=?";
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991666300U" + countnum; //이용기관번호 본인 것 입력
    connection.query(userSearchSql,[userId], function(err, results){
      if(err) throw err;
      else {
        var option = {
          method: "GET",
          url: "https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num",
          headers: {
            "Authorization" : "Bearer " + results[0].accesstoken
          },
          //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json
          qs: {
            bank_tran_id : transId,
            fintech_use_num : finusenum,
            tran_dtime : "20201022144300"
          },
        };
        request(option, function(err, response, body){
          var balanceData = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
          console.log(balanceData);
          res.json(balanceData)
        })    
      }
    })
})

app.post('/transactionlist', auth, function(req, res) {
    var userId = req.decoded.userId;
    var finusenum = req.body.fin_use_num;
    //데이터베이스에 사용자 Accesstoken , 조회 후
    //금융위 API 거래내역 조회 요청 만들고 데이터 그대로 response하기
    var userSearchSql = "SELECT * FROM user WHERE id=?";
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991666300U" + countnum; //이용기관번호 본인 것 입력
    connection.query(userSearchSql,[userId], function(err, results){
      if(err) throw err;
      else {
        var option = {
          method: "GET",
          url: "https://testapi.openbanking.or.kr/v2.0/account/transaction_list/fin_num",
          headers: {
            "Authorization" : "Bearer " + results[0].accesstoken
          },
          //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json
          qs: {
            bank_tran_id : transId,
            fintech_use_num : finusenum,
            inquiry_type : 'A',
            inquiry_base : 'D',
            from_date : '20200101',
            to_date : '20200101',
            sort_order : 'D',
            tran_dtime : '20201022160000'
          },
        };
        request(option, function(err, response, body){
          var transactionData = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
          console.log(transactionData);
          res.json(transactionData)
        })    
      }
    })
})


// app.post('/getData',function(req, res){
//   console.log(req.body);
//   var getUserId = req.body.sendUserId;
//   var getUserPassword = req.body.sendUserPassword;
//   console.log(getUserId, getUserPassword);
//   res.json(1);
// })

app.listen(3000);
