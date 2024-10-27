var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const methodOverride = require('method-override');
const session = require('express-session');
//const connectFlash = require('connect-flash');



var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const zaposlenikRouter = require('./routes/zaposlenik')
const menadzerRouter = require('./routes/menadzer')
const chatRouter = require('./routes/chat')


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("secret_passcode"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(session({
  secret: "secret_passcode",
  cookie: {
    maxAge: 4000000
  },
  resave: false,
  saveUninitialized: false
}))


/*app.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  req.session.isAuth = true;
  console.log(req.session);
  console.log(req.session.id);
  res.send("HI SESS");
});*/
//app.use(connectFlash());


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/zaposlenik', zaposlenikRouter);
app.use('/menadzer', menadzerRouter);
app.use('/chat', chatRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
