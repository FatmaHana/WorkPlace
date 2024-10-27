var express = require('express');
var router = express.Router();

const pg = require('pg');
const config = {
  user: 'kawppfiq',
  host: 'tai.db.elephantsql.com',
  database: 'kawppfiq',
  password: 'dk_lqe0Cb8VhhxWDIAbybheTmDnzqIW4',
  port: 5432,
  max: 100,
  idleTimeoutMillis: 3000,
  connectionTimeoutMillis: 2000
}

const pool = new pg.Pool(config);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/forma', function(req, res, next) {
  res.render('chat');
});

router.get('/poruka', function(req, res, next) {
  console.log('PORUKA');
});

module.exports = router;
