import express from "express";
import morgan from "morgan";
import session from "express-session";
import MongoStore from "connect-mongo";
import rootRouter from "./routers/rootRouter";
import userRouter from "./routers/userRouter";
import videoRouter from "./routers/videoRouter";
import { localsMiddleware } from "./middleware";
import apiRouter from "./routers/apiRouter";

const app = express();
const logger = morgan("dev");

app.set("view engine", "pug");
app.set("views", process.cwd() + "/src/views");
app.use(logger);
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
    }),
  })
);
// 2023-06-22T03:04:35.187Z
app.use((req, res, next) => {
  req.sessionStore.all((error, sessions) => {
    // console.log(sessions);
    next();
  });
});

app.get("/add-one", (req, res, next) => {
  req.session.potato += 1;
  console.log(req.session);
  return res.send(`${req.session.id}, ${req.session.potato}`);
});

app.use(localsMiddleware);
app.use("/uploads", express.static("uploads"));
app.use("/assets", express.static("assets"));
app.use("/", rootRouter);
app.use("/videos", videoRouter);
app.use("/users", userRouter);
app.use("/api", apiRouter);

// listen() 함수 콜백은 서버가 시작될 때 작동하는 함수이다.
// 콜백을 작성하기 전, 서버에게 어떤 port를 listening 할지 얘기해줘야 한다.

// request는 뭔가를 요청한다는 것, 쿠키나 method, url, headers 같은 정보를 얻을 수 있다.
// 브라우저가 request를 보내면 서버는 무언가를 응답해줘야 한다.
// 그래서 우리는 res.end() 라고 보낼 것이다. 그러면 이 함수가 reponse를 끝낼 것이다.

export default app;
