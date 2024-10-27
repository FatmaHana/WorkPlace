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

const pool = new pg.Pool(config);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/forma/projekat', async function(req, res, next) {
  console.log('HIIII');
  let client;
  try {
    let uloga = req.session.uloga;

    client = await pool.connect();
    //const radnici = await client.query('SELECT z.id, z.email FROM zaposlenik z');

    res.render('novi_projekat', { uloga: uloga } );
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});

router.get('/forma/task', async function(req, res, next) {
  console.log('HIIII');
  let client;
  try {
    let menadzer_id = req.session.userID;
    let uloga = req.session.uloga;

    client = await pool.connect();
    const projekti = await client.query('select p.id, p.ime FROM projekat p WHERE menadzer = $1', [menadzer_id] );
    const radnici = await client.query('SELECT z.id, z.email FROM zaposlenik z');

    res.render('novi_task', { radnici : radnici.rows, projekti : projekti.rows, uloga : uloga });
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});


router.get('/svi/projekti', async function(req, res, next) {
  console.log('HIIII');
  let client;
  try {
    let menadzer_id = req.session.userID;
    let uloga = req.session.uloga;
    client = await pool.connect();
    let projekti;
    if(uloga === 'Menadzer')
      projekti = await client.query('select * FROM projekat p WHERE menadzer = $1', [menadzer_id] );
    else if(uloga === 'Radnik')
      projekti = await client.query('select * FROM projekat p join task t on t.projekat_id = p.id WHERE t.zaposlenik_id = $1', [menadzer_id] );
    else
      projekti = await client.query('select * FROM projekat p');

    res.render('projekti', { projekti : projekti.rows, uloga : uloga });
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});



router.get('/moji/taskovi', async function(req, res, next) {
  console.log('HIIII');
  let client;
  try {
    let korisnik_id = req.session.userID;
    let uloga = req.session.uloga;
    client = await pool.connect();
    const taskovi = await client.query('select * FROM task WHERE zaposlenik_id = $1', [korisnik_id] );

    res.render('taskovi', { taskovi : taskovi.rows, uloga : uloga });
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client) {
      console.log('client is endeed being released, rest assured!')
      client.release();

    }
  }
});


router.get('/zadani/taskovi', async function(req, res, next) {
  console.log('HIIII');
  let client;
  try {
    let menadzer_id = req.session.userID;
    let uloga = req.session.uloga;

    client = await pool.connect();
    const taskovi = await client.query('select * FROM task WHERE menadzer_id = $1', [menadzer_id] );

    res.render('taskovi', { taskovi : taskovi.rows, uloga : uloga });
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});



router.get('/izvjestaj/po/projektima', async function(req, res, next) {
  let client;
  try {
    let menadzer_id = req.session.userID;
    let uloga = req.session.uloga;
    let nadredeni_id = req.session.nadredeni;

    client = await pool.connect();
    let nadredeni_email = client.query('select z.email from zaposlenik z where z.id = $1', [nadredeni_id]);
    let podaci;
    if(uloga === 'Menadzer')
      podaci = await client.query('select p.ime as ime, sum(s.broj_sati) as br_sati\n' +
                                        'from projekat p\n' +
                                        'left join task t\n' +
                                        'on p.id = t.projekat_id\n' +
                                        'left join sati s\n' +
                                        'on t.id = s.task_id\n' +
                                        'where p.menadzer = $1\n' +
                                        'group by p.ime', [menadzer_id]);
    else if (uloga === 'Admin')
      podaci = await client.query('select p.ime as ime, sum(s.broj_sati) as br_sati\n' +
          'from projekat p\n' +
          'left join task t\n' +
          'on p.id = t.projekat_id\n' +
          'left join sati s\n' +
          'on t.id = s.task_id\n' +
          'group by p.ime');
    res.render('izvjestaj_projekat', { podaci : podaci.rows , uloga : uloga, nadredeni_email : nadredeni_email});
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});

router.post('/izvjestaj/po/radnicima', async function(req, res, next) {
  let client;
  try {
    let menadzer_id = req.session.userID;
    let radnik_id = req.body.radnik;
    let uloga = req.session.uloga;

    console.log('radnik nam je: ', radnik_id);
    client = await pool.connect();
    let podaci;
    if(uloga === 'Menadzer')
      podaci = await client.query('select p.ime as ime, sum(s.broj_sati) as br_sati\n' +
        'from projekat p\n' +
        'join task t\n' +
        'on p.id = t.projekat_id\n' +
        'left join sati s\n' +
        'on t.id = s.task_id\n' +
        'where t.zaposlenik_id = $1 and t.menadzer_id = $2\n' +
        'group by p.ime', [radnik_id, menadzer_id]);
    else if(uloga === 'Admin')
      podaci = await client.query('select p.ime as ime, sum(s.broj_sati) as br_sati\n' +
          'from projekat p\n' +
          'join task t\n' +
          'on p.id = t.projekat_id\n' +
          'left join sati s\n' +
          'on t.id = s.task_id\n' +
          'where t.zaposlenik_id = $1\n' +
          'group by p.ime', [radnik_id]);

    res.render('izvjestaj_projekat', { podaci : podaci.rows , uloga :uloga});
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});

router.get('/izvjestaj/po/radnicima/forma', async function(req, res, next) {
  let client;
  try {
    let menadzer_id = req.session.userID;
    let uloga = req.session.uloga;

    client = await pool.connect();
    const radnici = await client.query('SELECT z.id, z.email FROM zaposlenik z');

    res.render('izvjestaj_po_radnicima', { radnici : radnici.rows, uloga : uloga});
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});

router.post('/unesi/sate', async function(req, res, next) {
  console.log('Usla unesi sate');
  let client;
  try {
    client = await pool.connect();

    const { taskID, br_sati } = req.body;
    console.log(taskID, br_sati);

    const result = await client.query('INSERT INTO sati (broj_sati, task_id) VALUES ($1, $2)', [br_sati, taskID]);
    res.status(200).json({ success: true, message: 'Data inserted successfully' });
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});


router.get('/unos/sati', async function(req, res, next) {
  console.log('HIIII');
  let client;
  try {
    let menadzer_id = req.session.userID;
    let uloga = req.session.uloga;
    client = await pool.connect();
    const podaci = await client.query('select t.id as task_id, t.naziv as task_ime, p.id as projekat_id, p.ime as projekat_ime FROM task t join projekat p on t.projekat_id = p.id WHERE zaposlenik_id = $1', [menadzer_id] );

    res.render('unos_sati', { podaci : podaci.rows, uloga : uloga});
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});


router.post('/promjeni/status', async function(req, res, next) {
  console.log('USLA SAM');
  let client;
  try {
    let projekat_id = req.body.projekatID;
    console.log(projekat_id);
    client = await pool.connect();
    const insertResult = await client.query('update projekat set status = 1 where id = $1', [projekat_id]);
    res.status(200).json({ success: true, message: 'Data inserted successfully' });

  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});


router.post('/promjeni/status/taska', async function(req, res, next) {
  console.log('USLA SAM');
  let client;
  try {
    let task_id = req.body.taskID;
    client = await pool.connect();
    const insertResult = await client.query('update task set status = 1 where id = $1', [task_id]);
    res.status(200).json({ success: true, message: 'Data inserted successfully' });

  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});

router.post('/dodaj/projekat', async function(req, res, next) {
  let client;
  try {
    let { imeprojekta, opis, startnidatum, zavrsnidatum} = req.body;
    let menadzer_id = req.session.userID;
    client = await pool.connect();
    const insertResult = await client.query('INSERT INTO projekat(ime, pocetak, kraj, menadzer, opis, status) VALUES($1, $2, $3, $4, $5, $6)  RETURNING id', [imeprojekta, startnidatum, zavrsnidatum, menadzer_id, opis, 0]);
    //const projekatID = insertResult.rows[0].id;

    /*
    for (const zaposlenikID of zaposlenici) {
      await client.query('INSERT INTO projekat_zaposlenik(projekat_id, zaposlenik_id) VALUES($1, $2)', [projekatID, zaposlenikID]);
    }*/
    //const radnici = await client.query('SELECT z.id, z.email FROM zaposlenik z');

    res.redirect('/menadzer/forma/projekat');
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});

router.post('/dodaj/task', async function(req, res, next) {
  let client;
  try {
    let { imetaska, imeprojekta, radnik } = req.body;

    let menadzer_id = req.session.userID;
    console.log(menadzer_id)
    client = await pool.connect();
    const insertResult = await client.query('INSERT INTO task(naziv, projekat_id, zaposlenik_id, menadzer_id, status) VALUES($1, $2, $3, $4, 0)', [imetaska, imeprojekta, radnik, menadzer_id]);

    res.redirect('/menadzer/forma/task');
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});
/*

router.get('/detalji/taska/:id', async function(req, res, next) {
  let client;
  try {
    let id = req.params.id;
    console.log(id);
    let uloga = req.session.uloga;
    client = await pool.connect();
    let podaci = await client.query('select p.ime as projekat, p.pocetak as pocetak, p.kraj as kraj, t.naziv as task, z.ime as menadzer_ime, z.prezime as menadzer_prezime from projekat p left join task t on p.id = t.projekat_id left join zaposlenik z on t.menadzer_id = z.id where t.id = $1', [id]);

    console.log('rendered data:',  podaci.rows);

    res.render('detalji_taska', { podaci: podaci.rows, uloga: uloga });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if(client)
      client.release();
  }
});
*/

router.get('/detalji/projekta/:id', async function(req, res, next) {
  let client;
  try {
    let id = req.params.id;
    console.log(id);
    let uloga = req.session.uloga;
    client = await pool.connect();
    let podaci = await client.query('select distinct p.ime as ime_projekta, p.pocetak as pocetak, p.kraj as kraj, p.menadzer as menadzer, z.ime as ime , z.prezime as prezime\n' +
          'from projekat p\n' +
          'left join task t\n' +
          'on p.id = t.projekat_id\n' +
          'left join zaposlenik z\n' +
          'on z.id = t.zaposlenik_id\n' +
          'where p.id =$1', [id]);
    console.log('rendered data:',  podaci.rows);

    res.render('detalji_projekta', { podaci: podaci.rows, uloga: uloga });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if(client)
      client.release();
  }
});

router.get('/dodijeli/radnike', async function(req, res, next) {
  let client;
  try {
    client = await pool.connect();
    const projectsResult = await client.query('SELECT p.ime FROM projekat p WHERE p.menadzer = $1', [req.params.id]);
    const workersResult = await client.query('SELECT z.ime FROM zaposlenik z WHERE z.uloga = $1', ['radnik']);
    const tasksResult = await client.query('SELECT t.naziv FROM task t');
    //client.release();

    const projekti = projectsResult.rows.map(projekat => projekat.ime);
    const radnici = workersResult.rows.map(radnik => radnik.ime);
    const taskovi = tasksResult.rows.map(task => task.naziv);
    res.render('dodijeli_radnike', { projekti, radnici, taskovi });
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if (client)
      client.release();
  }
});


router.post('/dodijeli/radnike', async function(req, res, next) {
  let client;
  try {
    let { imeprojekta, radnik, task } = req.body;
    let menadzer_id = req.params.id;
    client = await pool.connect();
    const imeprojekta_id = await client.query('select p.id from projekat p where p.ime = $1', [imeprojekta]);
    const task_id = await client.query('select t.id from task t where t.naziv = $1', [task]);
    const radnik_id = await client.query('select z.id from zaposlenik z where z.naziv = $1', [radnik]);

    const insertResult1 = await client.query('INSERT INTO projekat_zaposlenik(projekat_id, zaposlenik_id) VALUES($1, $2)', [imeprojekta_id, radnik_id]);
    const insertResult2 = await client.query('INSERT INTO task_zaposlenik(task_id, zaposlenik_id) VALUES($1, $2)', [task_id, radnik_id]);
    const selectResult = await client.query('SELECT * FROM projekat WHERE menadzer = $1', [menadzer_id]);
    //client.release();
    console.log('after insertion');
    console.log('menazder_id:', menadzer_id);

    res.redirect('/menadzer');
    //res.render('menadzer', { Projekti: selectResult.rows, id: req.params.id });
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});

module.exports = router;
