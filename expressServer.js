const express = require('express');
const request = require("request");
const app = express()

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
        console.log(body);
        res.json(body);
    })
})

// app.post('/getData', function(req, res) {
//     console.log(req.body);
//     var getUserId = req.body.sendUserId;
//     var getUserPassword = req.body.sendUserPassword;
//     console.log(getUserId, getUserPassword);
//     res.json(1);
// })
 
app.listen(3000)