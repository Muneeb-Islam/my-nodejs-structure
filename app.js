require("./config/config");
require("./src/databases/mongoose");
const express = require("express");
const cors = require("cors");
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cron = require("node-cron");
const index = require("./src/routes");
const app = express();
const fs = require("fs");

app.use("/", index);
// view engine setup
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(
  logger("common", {
    stream: fs.createWriteStream(path.join(__dirname), {
      flags: "a",
    }),
  })
);
app.use(bodyParser.json({ limit: "2mb" }));
app.use(
  bodyParser.urlencoded({ extended: false, limit: "2mb", parameterLimit: 1000 })
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(fileUpload());

// versioning
// will do 2 types of version
// 1- Major versions e.g: 1, 2, 3 .... (URL Path Versioning)
// 2- Minor versions e.g: 1.1, 1.2 .... (URL Param Versioning: when only few endpoints need a change in an api-set)
const { v1_routes } = require("./src/routes/v1/index");
v1_routes(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  if (process.env.NODE_ENV === "development") {
    var err = new Error("Not Found");
    err.status = 404;
    next(err);
  } else {
    return res.status(404).json({
      message: "Route not Exist",
    });
  }
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
