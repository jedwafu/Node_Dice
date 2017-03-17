﻿/**
 * Copyright 2017 Node Dice
 *
 * Created by Neo on 2017/01/17.
 */
import userHelper from '../helper/userHelper';
import crypto from'crypto';
import coinsConfig from '../../config/coinsConfig.js';

export default (io) => {
    
    //socket.io events
    io.on('connection',  (socket) => {
        const session = socket.handshake.session;
        socket.emit('coinNames', coinsConfig.getCoinNames());

        //return a new user
        socket.on('newUser',  (username) => {
            userHelper.CreateNewUser(username,  (err, user)=>  {
                if (err) { 
                    if (err.code == 11000)
                        socket.emit('newUser', { error: { code: 11000 } });
                }
                else {
                    session.userid = user.guid;
                    session.username = user.userName;
                    session.save();
                    let date = new Date();
                    date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000)); // set day value to expiry
                    let expires = "expires=" + date.toGMTString();
                    
                    socket.handshake.headers.cookie = "newUser=0;" + expires + "; path=/";
                    socket.emit('newUser', {
                        userid: user.guid,
                        userName: user.userName,
                        clientSalt: user.clientSalt, 
                        funds: user.funds,
                        nonce: 0,
                        hashedServerSalt: crypto.createHash('sha512').update(user.serverSalt).digest('hex')
                    });
                }
            });
        });
        
        //return an existing user
        socket.on('existingUser',  () => {
            userHelper.GetUserById(session.userid, "clientSalt serverSalt guid userName funds nonce",
                (err, u) => {
                if (err) {
                    socket.emit('existingUser', { clientSalt: '', error: err });
                }
                else {
                    if (u) {
                        socket.emit('existingUser', {
                            userid: u.guid,
                            userName: u.userName,
                            clientSalt: u.clientSalt , 
                            funds: u.funds,
                            nonce: u.nonce,
                            hashedServerSalt: crypto.createHash('sha512').update(u.serverSalt).digest('hex')
                        });
                    }
                    else {
                        socket.emit('existingUser', { clientSalt: '', error: 'session expired' });
                    }
                }
            });
        });
        
        //update client salt
        socket.on('clientSalt', (clientSalt) => {
            userHelper.SaveClientSalt(session.userid, clientSalt, (err, oldSalt) => {
                if (err)
                    socket.emit('savingClientSalt', err);
                else
                    socket.emit('savingClientSalt', oldSalt);
            });
        });

        //get new bitcion address
        socket.on('newCoinAddr', (coinName) => {
            userHelper.GetNewAddress(session.userid, coinName, (err, addr) => {
                if (err)
                    socket.emit('newCoinAddr', err);
                else
                    socket.emit('newCoinAddr', addr);
            });
        });

        //get user balance
        socket.on('getBalance', (coinName) => {
            userHelper.GetBalance(session.userid, coinName, (err, balance) => {
                if (err)
                    socket.emit('getBalance', err);
                else
                    socket.emit('getBalance', balance);
            });
        });
        
    });

    //functions
  //  function CreateNewUser() { }
};
