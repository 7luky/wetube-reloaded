import mongoose from "mongoose";

mongoose.connect(process.env.DB_URL);

const db = mongoose.connection;

const handleOpen = () => console.log("✅ Connected to DB");
const handleError = (error) => console.log("❌ DB Error", error);

db.on("error", handleError);
db.once("open", handleOpen);
// on과 once의 차이점, on은 여러번 계속 발생시킬 수 있다. 클릭 같은 이벤트 말이다.
// once는 오로지 한번만 발생한다는 뜻이다.

/*
CRUD

Create
Read
Update
Delete
*/
