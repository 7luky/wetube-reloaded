import express from "express";
import morgan from "morgan";

const PORT = 4000;
const app = express();
const logger = morgan("dev");

const globalRouter = express.Router();
const userRouter = express.Router();
const videoRouter = express.Router();

const privateMiddleware = (req, res, next) => {
  const url = req.url;
  if (url === "/protected") {
    return res.send("<h1>Not Allowed</h1>");
  }
  console.log("Allowed, you may continue.");
  next();
};

const handleHome = (req, res) => {
  res.send("I love middlewares");
};

const handleProtected = (req, res) => {
  return res.send("Welcome to he private lounge.");
};

app.use(logger);
app.use(privateMiddleware);
app.get("/", handleHome);
app.get("/protected", handleProtected);

const handleListening = () =>
  console.log(`✅ Server listenting on port http://localhost:${PORT} 🚀`);

app.listen(PORT, handleListening);
// listen() 함수 콜백은 서버가 시작될 때 작동하는 함수이다.
// 콜백을 작성하기 전, 서버에게 어떤 port를 listening 할지 얘기해줘야 한다.

// request는 뭔가를 요청한다는 것, 쿠키나 method, url, headers 같은 정보를 얻을 수 있다.
// 브라우저가 request를 보내면 서버는 무언가를 응답해줘야 한다.
// 그래서 우리는 res.end() 라고 보낼 것이다. 그러면 이 함수가 reponse를 끝낼 것이다.
