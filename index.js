const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const PORT= process.env.PORT;
const DB_TABLE_NAME = process.env.DB_TABLE_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const SECRET_KEY = process.env.SECRET_KEY;

if(!PORT || !DB_TABLE_NAME || !DB_USER || !DB_USER || !DB_PASSWORD || !DB_HOST || !DB_PORT || !SECRET_KEY) {
    console.error("нету енвов")
    return;
}
/*
  Include the user model for saving to MongoDB VIA mongoose
*/
const User = require("./models/user");

/*
  Database connection -- We are using MongoDB for this tutorial
*/
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const app = express();
const Connect = async () => {
    await mongoose.connect(`mongodb://${DB_HOST}:${DB_PORT}/${DB_TABLE_NAME}`, {
        authSource: DB_TABLE_NAME,
        user: DB_USER,
        pass: DB_PASSWORD,
    } );

    /*
      Session configuration and utilization of the MongoStore for storing
      the session in the MongoDB database
    */
    app.use(express.urlencoded({extended: false}));
    app.use(session({
        secret: SECRET_KEY,
        resave: false,
        saveUninitialized: true,
        store: MongoStore.create({
            client: mongoose.connection.getClient(),
            dbName: DB_TABLE_NAME,
            stringify: false,
            autoRemove: "interval",
            autoRemoveInterval: 1
        })
    }));

    /*
      Setup the local passport strategy, add the serialize and
      deserialize functions that only saves the ID from the user
      by default.
    */
    const strategy = new LocalStrategy(User.authenticate())
    passport.use(strategy);
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
    app.use(passport.initialize());
    app.use(passport.session());

    /*
      Beyond this point is all system specific routes.
      All routes are here for simplicity of understanding the tutorial
      /register -- Look closer at the package https://www.npmjs.com/package/passport-local-mongoose
      for understanding why we don't try to encrypt the password within our application
    */
    app.post('/register', function (req, res) {
        User.register(
            new User({
                email: req.body.email,
                username: req.body.username
            }), req.body.password, function (err, msg) {
                if (err) {
                    res.send(err);
                } else {
                    res.send({message: "Successful"});
                }
            }
        )
    })

    /*
      Login routes -- This is where we will use the 'local'
      passport authenciation strategy. If success, send to
      /login-success, if failure, send to /login-failure
    */
    app.post('/login', passport.authenticate('local', {
        failureRedirect: '/login-failure',
        successRedirect: '/login-success'
    }), (err, req, res, next) => {
        if (err) next(err);
    });

    app.get('/login-failure', (req, res, next) => {
        console.log(req.session);
        res.send('Login Attempt Failed.');
    });

    app.get('/login-success', (req, res, next) => {
        console.log(req.session);
        res.send('Login Attempt was successful.');
    });

    /*
      Protected Route -- Look in the account controller for
      how we ensure a user is logged in before proceeding.
      We call 'isAuthenticated' to check if the request is
      authenticated or not.
    */
    app.get('/profile', function (req, res) {
        console.log(req.session)
        if (req.isAuthenticated()) {
            res.json({message: 'You made it to the secured profie'})
        } else {
            res.json({message: 'You are not authenticated'})
        }
    })

    app.listen(PORT, () => {
        console.log(`Server started. on port: ${PORT}`)
    });

}
Connect();