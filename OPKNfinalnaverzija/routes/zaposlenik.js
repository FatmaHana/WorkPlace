var express = require('express');
var router = express.Router();

const pg = require('pg');
const config = {
  user: 'kawppfiq',
  host: 'tai.db.elephantsql.com',
  database: 'kawppfiq',
  password: 'dk_lqe0Cb8VhhxWDIAbybheTmDnzqIW4',
  port: 5432,
  max: 500,
  idleTimeoutMillis: 3000,
  connectionTimeoutMillis: 2000
}

const bcrypt = require('bcrypt');
const saltRounds = 10;
const pool = new pg.Pool(config);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.delete('/brisi/:id', async function(req, res, next) {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('DELETE FROM zaposlenik WHERE id = $1', [req.params.id]);
    res.send(`Uspjesno izbrisan red iz tabele sa id-em ${req.params.id}`);
  } catch (err) {
    res.send(err);
  } finally {
    if (client)
      client.release();
  }
});

router.post('/dodaj', async function(req, res, next) {
  let client;
  try {
    let { ime, prezime, sifra, uloga, email, nadredeni } = req.body;
    console.log(req.body);
    client = await pool.connect();
    const result = await client.query('INSERT INTO zaposlenik (ime, prezime, sifra, uloga, email, nadredeni) VALUES ($1, $2, $3, $4, $5, $6)', [ime, prezime, sifra, uloga, email, nadredeni]);
    //client.release();
    console.log(result);
    res.redirect('/dodaj');
  } catch (err) {
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});

/*
router.get('/uredi/:id', function (req, res, next) {
  pool.connect((err, client, done) => {
    if(err) {
      res.send(err)
    }
    client.query('select * from zaposlenik where id = $1', [req.params.id], (err, result) => {
      done()
      if(err) {
        res.send(err)
      }
      console.log((result.rows)[0])
      res.render('uredi_zaposlenik', {podaci: (result.rows)[0], id : req.params.id})
    })
  })
});*/

router.get('/uredi/:id', async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const result1 = await client.query('SELECT z.id, z.ime, z.prezime, z.uloga, z.email FROM zaposlenik z WHERE id = $1', [req.params.id]);
    const result2 = await client.query('SELECT z.id, z.email FROM zaposlenik z');

    console.log(result1.rows[0]);
    //client.release();

    res.render('uredi_zaposlenik', { podaci: result1.rows[0], radnici : result2.rows});

  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});


router.post('/uredi/trenutni/:id', async function(req, res, next) {
  let client;
  let { ime, prezime, password, uloga, email, nadredeni } = req.body;
  nadredeni = nadredeni.trim() === '' ? null : parseInt(nadredeni);
  password = (password && password.trim() !== '') ? password.trim() : null;

  console.log(ime, prezime, password, uloga, email, nadredeni)
  console.log(req.params.id)
  try {
    client = await pool.connect();

    if (password !== null) {
      console.log('Usli smo u if...');
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log(hashedPassword)
      const result = await client.query('UPDATE zaposlenik SET ime = $2, prezime = $3, sifra = $4, uloga = $5, email = $6, nadredeni = $7 WHERE id = $1', [req.params.id, ime, prezime, hashedPassword, uloga, email, nadredeni]);

    } else {
      console.log('Usli smo u else');
      const result = await client.query('UPDATE zaposlenik SET ime = $2, prezime = $3, uloga = $4, email = $5, nadredeni = $6 WHERE id = $1', [req.params.id, ime, prezime, uloga, email, nadredeni]);

    }

    const zaposlenici = await client.query('SELECT z.id, z.ime, z.prezime, z.email FROM zaposlenik z');
    res.render('administratorskipanel', { Zaposlenici: zaposlenici.rows });
  } catch (err) {
    console.error('Error updating employee:', err);
    return res.status(500).send(`Error updating employee: ${err.message}`);
  } finally {
    if(client)
      client.release();
  }
});


module.exports = router;
