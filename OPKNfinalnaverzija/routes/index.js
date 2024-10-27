var express = require('express');
var router = express.Router();
//const axios = require('axios');
const puppeteer = require('puppeteer');
const nodeMailer = require('nodemailer');
//const cookie = require('cookie');

//const fs = require('fs');
//const PDFCreator = require('pdf-creator-node');
var io = null;
var poruke = [];
var users = [];

const bcrypt = require('bcrypt');
const saltRounds = 10;
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
  const password = '1234';

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Hashed Password:', hash);
    }
  });
  res.render('index', { title: 'Express' });
});


/* GET home page. */
router.get('/pocetna', async function(req, res, next) {

  let client;
  try {
    client = await pool.connect();
    let uloga = req.session.uloga;
    if(uloga === 'Admin') {
      const zaposlenici = await client.query('SELECT z.id, z.ime, z.prezime, z.email FROM zaposlenik z');
      res.render('administratorskipanel', { Zaposlenici: zaposlenici.rows });
    } else if (uloga === 'Menadzer' || uloga === 'Radnik'){
      res.render('menadzer', {uloga : req.session.uloga});
    }
  } catch (err) {
    console.error('/administrator error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  } finally {
    if(client)
      client.release();
  }

});

router.get('/login', function(req, res, next) {
  res.render('login_forma');
});

router.post('/registracija', async (req, res, next) => {
  let client;
  try {
    console.log(req.body);
    let {ime, prezime, password, uloga, email, nadredeni} = req.body;

    nadredeni = nadredeni && nadredeni.trim() !== ''
        ? parseInt(nadredeni.trim())
        : null;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    client = await pool.connect();

    const result1 = await client.query(
        'INSERT INTO zaposlenik(ime, prezime, sifra, uloga, email, nadredeni) VALUES($1, $2, $3, $4, $5, $6)',
        [ime, prezime, hashedPassword, uloga, email, nadredeni]
    );

    const result2 = await client.query('SELECT z.id, z.ime, z.prezime, z.email FROM zaposlenik z');
    res.render('administratorskipanel', { Zaposlenici: result2.rows });

  } catch (err) {
    console.error('Error executing query:', err);
    res.redirect('/registracija');
  } finally {
    if(client)
      client.release();
  }
});

router.post('/login/autentikacija', async (req, res, next) => {
  console.log('ENTERED post');
  let client;
  try {
    let email = req.body.email;
    let sifra = req.body.password;


    console.log("sifra", sifra);

    client = await pool.connect();

    const result = await client.query('SELECT * FROM zaposlenik WHERE email=$1;', [email]);
    console.log('sifra: ', sifra, '   email: ', email);

    if (result.rows.length > 0) {
      const dbPassword = result.rows[0].sifra;

      console.log('dbsifra: ', dbPassword);

      const match = await bcrypt.compare(sifra, dbPassword);
      if (match) {
        req.session.userID = result.rows[0].id;
        req.session.uloga = result.rows[0].uloga;
        req.session.nadredeni = result.rows[0].nadredeni;
        if(result.rows[0].uloga === 'Admin') {
          const zaposlenici = await client.query('SELECT z.id, z.ime, z.prezime, z.email FROM zaposlenik z');
          res.render('administratorskipanel', { Zaposlenici: zaposlenici.rows });
        } else if (result.rows[0].uloga === 'Menadzer' || result.rows[0].uloga === 'Radnik'){
          res.render('menadzer', {uloga : req.session.uloga});
        }

      } else {
        res.redirect('/login');
        //res.status(401).send('Invalid username or password');
      }

    } else {
      res.redirect('/login');
    }
  } catch (err) {
    console.error('/login/autentikacija error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  } finally {
    if(client)
      client.release();
  }
});

router.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      res.sendStatus(500);
    } else {
      res.clearCookie('connect.sid');
      res.redirect('/login');
    }
  });
});


router.get('/administrator', async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT  z.ime, z.prezime, z.email FROM zaposlenik z');
    res.render('administratorskipanel', { Zaposlenici: result.rows });

  } catch (err) {
    console.error('/administrator error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  } finally {
    if(client) {
      client.release();
      console.log('RELEASED');
    }
  }
});

/*
router.get('/menadzer/:id', async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT p.id, p.ime, p.pocetak, p.kraj, p.opis FROM projekat p WHERE p.menadzer = $1', [req.params.id]);
    res.render('menadzer', { Projekti: result.rows, id: req.params.id });

  } catch (err) {
    console.error('/menadzer/:id error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  } finally {
    if (client)
      client.release();
  }
});
*/
router.get('/dodaj', async function(req, res, next) {
  let client;
  try {
    client = await pool.connect();
    const radnici = await client.query('SELECT z.id, z.email FROM zaposlenik z');
    res.render('dodaj_zaposlenik', {radnici : radnici.rows});

  } catch (err) {
    res.status(500).send({ error: 'Internal Server Error' });
  } finally {
    if (client)
      client.release();
  }
});

router.get('/uredi/:id', function(req, res, next) {
  res.render('uredi_zaposlenik', {id: req.params.id});
});

/*
router.post('/PDF', async function(req, res, next) {
  let client;
  try {
    let menadzer_id = req.session.userID;
    client = await pool.connect();

    const podaci = await client.query('select p.ime as ime, sum(s.broj_sati) as br_sati\n' +
        'from projekat p\n' +
        'join task t\n' +
        'on p.id = t.projekat_id\n' +
        'join sati s\n' +
        'on t.id = s.task_id\n' +
        'where p.menadzer = $1\n' +
        'group by p.ime', [menadzer_id]);

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Generate HTML with dynamic data
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="container">
            <div class="row justify-content-center">
              <div class="col-8 position-relative">
                <div class="table-responsive-md">
                  <table class="table caption-top">
                    <thead>
                      <tr>
                        <th scope="col">Ime projekta</th>
                        <th scope="col">Broj sati utrošeno na projektu</th>
                      </tr>
                    </thead>
                    <tbody class="table-group-divider">
                      ${podaci.rows.map(podatak => `
                        <tr>
                          <td>${podatak.ime}</td>
                          <td>${podatak.br_sati}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <button id="convertBtn">PDF</button>
          </div>
        </body>
      </html>
    `;

    // Log HTML content to verify dynamic data
    console.log('HTML Content:', htmlContent);

    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf();

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');
    res.send(pdfBuffer);

    console.log('Dynamic Data:', podaci.rows);
    console.log('HTML Content:', htmlContent);


  } catch (error) {
    console.error('Error in Puppeteer:', error);
    next(error); // Ensure to propagate the error to the next middleware
  }
});
*/
// New endpoint to handle start and finish events
router.post('/radno/vrijeme', async (req, res) => {
  console.log('Usla radno vrijeme');
  let client;
  try {
    client = await pool.connect();

    const { action, timestamp } = req.body;
    const datum = timestamp.split('T')[0]; // Extract date part
    const vrijeme = timestamp.split('T')[1]; // Extract time part

    let zaposlenikID = req.session.userID;
    // Assuming you have a 'work_events' table
    if (action === 'start') {
      // Logic for handling start event
      const result = await client.query('INSERT INTO radno_vrijeme (pocetno_vrijeme, datum, zaposlenik_id) VALUES ($1, $2, $3)', [vrijeme, datum, zaposlenikID]);
      res.status(200).json({ success: true, message: 'Start event logged successfully' });
    } else if (action === 'finish') {
      const result = await client.query('UPDATE radno_vrijeme SET zavrsno_vrijeme = $1 WHERE zaposlenik_id = $2 AND datum = $3', [vrijeme, zaposlenikID, datum]);
      res.status(200).json({ success: true, message: 'Finish event logged successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error logging event' });
  } finally {
    if (client)
      client.release();
  }
});


router.get('/prisustvo/forma', async function(req, res, next) {
  let client;
  try {

    client = await pool.connect();
    const radnici = await client.query('SELECT z.id, z.email FROM zaposlenik z');

    res.render('radno_vrijeme_forma', { radnici : radnici.rows});
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});


router.get('/prisustvo', async function(req, res, next) {
  let client;
  try {
    let zaposlenik_id = req.query.radnik;
    console.log('zaposlenik_id: ', zaposlenik_id)
    client = await pool.connect();
    const podaci = await client.query('SELECT * from radno_vrijeme where zaposlenik_id = $1', [zaposlenik_id]);

    res.render('izvjestaj_radno_vrijeme', { podaci : podaci.rows});
  } catch (err) {
    console.error(err);
    res.send(err);
  } finally {
    if(client)
      client.release();
  }
});



router.get('/email', function(req, res, next) {
  const { toEmail, pdfPath } = req.body;

  // Create a transporter using SMTP transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your_email@gmail.com', // Your Gmail email address
      pass: 'your_password' // Your Gmail password or an app-specific password
    }
  });

  // Email options
  const mailOptions = {
    from: 'your_email@gmail.com', // Sender's email address
    to: toEmail,
    subject: 'PDF Attachment from Node.js',
    text: 'Please find the attached PDF file.',
    attachments: [
      {
        filename: 'example.pdf', // Name of the attached file
        content: fs.createReadStream(pdfPath) // Path to the PDF file
      }
    ]
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error:', error.message);
      res.status(500).send('Error sending email');
    } else {
      console.log('Email sent:', info.response);
      res.status(200).send('Email sent successfully');
    }
  });
});
module.exports = router;
