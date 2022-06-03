const { request } = require('express')
const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const { all } = require('express/lib/application')
const res = require('express/lib/response')
const app = express()
const { Pool } = require('pg')
const methodOverride = require('method-override')
const bcrypt = require('bcrypt')
const session = require('express-session')
const port = process.env.PORT || 8080

let db

if (process.env.NODE_ENV === 'production'){

  db = new Pool ({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnuserized: false
    }
  })
} else {
  db = new Pool({
  user: 'postgres',
  database: 'toddle',
  password: process.env.DATABASE_PASSWORD
})
}


app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    var method = req.body._method
    delete req.body._method
    return method
  }
}))

app.use(express.static('public'))
app.use(session({ secret: 'keyboard cat', resave: true, saveUninitialized: true}))

app.use(function(req, res, next) {
  if (req.session.userId){
    res.locals.isLoggedIn = true;

    const sql = `select * from users where userid = $1`
    db.query(sql, [req.session.userId], (err, dbRes) => {
      res.locals.currentUser = dbRes.rows[0]
      next()
    })
  } else {
    res.locals.isLoggedIn = false;
    res.locals.currentUser = {}
    next()
  }
})

app.get('/', (req, res) => {
  if (res.locals.isLoggedIn){
    res.redirect('/home')
  } else {
    res.render('login', {
      error: ''
  })
  }
})

app.post('/', (req, res) => {
  let sql = `SELECT * from users where handle = $1`

  db.query(sql, [req.body.username], (err, dbRes) => {
    if (dbRes.rows.length === 0) {
      res.render('login', {
        error: "Account not found."
      })
      return
    } else {
      res.render('password', {
        username: [req.body.username],
        error: ''
      })
    }
  })
})

app.get('/sign-up', (req, res) => {
  res.render('signup')
})

app.post('/create-account', (req, res) => {
  let name = req.body.name
  let handle = req.body.username
  let plainTextPassword = req.body.password

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(plainTextPassword, salt, (err, passwordDigest) => {

      const sql = `
      WITH ins AS (
        INSERT INTO users (name, handle, pfp, following_count, follower_count, todd_count, passworddigest)
          VALUES ($1, $2, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREaHdxLYv2ZHnXQAChGS5i11Q6ip-7aus1_g&usqp=CAU', 0, 0, 0, $3) 
        RETURNING userid
      )
      INSERT INTO follower (followerid, followeeid)
        SELECT userid, userid
      FROM ins;`

      db.query(sql, [`${name}`, `${handle}`, `${passwordDigest}`], (err, dbRes) => {
        console.log(err)
        res.redirect('/home')
      })
    });
  });
})

app.post('/enter-password', (req,res) => {
  let password = req.body.password
  let username = req.body.username

  let sql = `SELECT * from users where handle = $1`
  db.query(sql, [username], (err, dbRes) => {
    let user = dbRes.rows[0]

    bcrypt.compare(password, user.passworddigest, (err, result) =>{
      if (result){
        req.session.userId = user.userid
        res.redirect('/home')
      } else {
        res.render('password', {
          username: username,
          error: 'Incorrect password'
        })
      }
   });
  })
})

app.use(expressLayouts);

app.get('/home', (req, res) => {
  if (res.locals.isLoggedIn) {
    let sql = `SELECT todds.tweetid, baby_todd_txt, normal_todd_txt, name, handle, pfp FROM todds JOIN users ON todds.userid = users.userid JOIN follower ON todds.userid = follower.followeeid WHERE followerid = $1 ORDER BY todds.tweetid DESC;`
    let sql1 = `SELECT name, handle, pfp FROM users where userid = $1;`
    Promise.all([
      db.query(sql, [`${req.session.userId}`]),
      db.query(sql1, [`${req.session.userId}`])
    ]).then(function([dbRes1, dbRes2]) {

      let toddInfo = dbRes1.rows
      let userInfo = dbRes2.rows[0]

      res.render('home', {
        users: toddInfo,
        loggedInUser: userInfo,
        currentUserId: req.session.userId
      })
    })
  } else {
    res.redirect('/')
  }
})

app.post('/todd', (req, res) => {
  let plainTextTodd = req.body.todd
  let babyTodd = plainTextToBabySpeak(plainTextTodd)
  let userId = req.body.userid
  
  let sql = `INSERT INTO todds (baby_todd_txt, normal_todd_txt, userid) VALUES ($1, $2, $3);`
  db.query(sql, [`${babyTodd}`, `${plainTextTodd}`, `${userId}`], (err, dbRes) => {

    db.query(`UPDATE users SET todd_count = todd_count + 1 WHERE userId = ${userId}`, (req, res) =>{
    })
    res.redirect('/home')
  })
})

app.get('/:handle', (req, res) =>{
  if (res.locals.isLoggedIn){
    let handle = req.params.handle
    let sql1 = `SELECT tweetid, name, handle, pfp, baby_todd_txt, normal_todd_txt from users JOIN todds on users.userid = todds.userid where handle = $1 ORDER BY todds.tweetid DESC;`
    let sql2 = `SELECT * FROM users WHERE handle = $1;`
    let sql3 = `SELECT followeeid FROM follower WHERE followerid = $1`
    let sql4 = `SELECT userid FROM users WHERE handle = $1`
    let sql5 = `SELECT name, handle, pfp FROM users WHERE userid = $1`

    Promise.all([
      db.query(sql1, [`${handle}`]),
      db.query(sql2, [`${handle}`]),
      db.query(sql3, [`${req.session.userId}`]),
      db.query(sql4, [`${handle}`]),
      db.query(sql5, [`${req.session.userId}`])
    ]).then(function([dbRes1, dbRes2, dbRes3, dbRes4, dbRes5]) {

      let toddInfo = dbRes1.rows
      let userInfo = dbRes2.rows[0]
      let followingArrOfObj = dbRes3.rows
      let currentViewUserId = dbRes4.rows[0].userid
      let loggedInUser =  dbRes5.rows[0]
      let followingArr = []

      followingArrOfObj.forEach(function(obj) {
        followingArr.push(obj.followeeid)
      })

      res.render('profile', {
        todds: toddInfo,
        profile: userInfo,
        following: followingArr,
        currentUserId: `${req.session.userId}`,
        currentViewUserId: currentViewUserId,
        loggedInUser: loggedInUser
      })
    })
  } else {
    res.redirect('/')
  }
})

app.delete('/logout', (req, res) => {
  req.session.userId = undefined
  res.redirect('/')
})

app.post('/edit-profile', (req, res)=> {
  let sql = 'update users set name = $1, bio = $2, pfp = $3 where userId = $4'
  db.query(sql, [req.body.name, req.body.bio, req.body.pfp, req.session.userId],  (err, dbRes) => {
    res.redirect(`/${req.body.handle}`)
  })
})

app.delete('/follow-unfollow', (req, res) =>{
  let sql = `delete from follower where followerid = $1 and followeeid = $2`
  db.query(sql, [req.session.userId, req.body.id], (err, dbRes) =>{
    db.query(`UPDATE users SET following_count = following_count - 1 WHERE userid = $1`, [req.session.userId], (err, dbRes) =>{
      db.query(`UPDATE users SET follower_count = follower_count - 1 WHERE userid = $1`, [req.body.id], (err, dbRes) =>{
      })
    })
    res.redirect(`/${req.body.handle}`)
  })
})

app.post('/follow-unfollow', (req, res) =>{
  let sql = `INSERT INTO follower (followerid, followeeid) VALUES ($1, $2)`
  db.query(sql, [req.session.userId, req.body.id], (err, dbRes) => {
    db.query(`UPDATE users SET following_count = following_count + 1 WHERE userid = $1`, [req.session.userId], (err, dbRes) =>{
      db.query(`UPDATE users SET follower_count = follower_count + 1 WHERE userid = $1`, [req.body.id], (err, dbRes) =>{
      })
    })
    res.redirect(`/${req.body.handle}`)
  })
})


function plainTextToBabySpeak(str){
  let randomBabySpeakArr = ['goo', 'gu', 'goooo', 'ga', 'gaa', 'baa', 'da']
  let counter = str.split(' ').length
  let result = []
  for(let i = 0; i <= counter; i++){
    let randomIndex = Math.floor(Math.random() * randomBabySpeakArr.length)
    result.push(randomBabySpeakArr[randomIndex])
  }
  return result.join(' ')
}

app.listen(8080);