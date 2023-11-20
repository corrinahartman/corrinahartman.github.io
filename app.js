
const axios = require('axios');
var express = require('express');
var request = require('request');
var crypto = require('crypto');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const session = require('express-session');


var client_id = 'fa536165373947c4b024fcd40868ba1a'; // your clientId
var client_secret = '1118eb4ee20e4a2fb21386fc122a6ad9'; // Your secret
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri


const generateRandomString = (length) => {
    return crypto
        .randomBytes(60)
        .toString('hex')
        .slice(0, length);
}

var stateKey = 'spotify_auth_state';

var app = express();

app.get('/app.js', (req, res) => {
    // Set the Content-Type header to indicate JavaScript file
    res.setHeader('Content-Type', 'application/javascript');
    // Send the JavaScript file
    res.sendFile('/app.js');
});


app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

app.get('/login', function (req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function (req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;
                localStorage.setItem('access_token', access_token); // Store in local storage


                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function (error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', function (req, res) {

    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token,
                refresh_token = body.refresh_token;
                localStorage.setItem('access_token', access_token); // Store in local storage
            res.send({
                'access_token': access_token,
                'refresh_token': refresh_token

            });
        }
    });
});



// main.js
//const access_token = '970aa5b94bf44f55bb97f6d65037d6fb'; // Replace with your Spotify access token
const albumId = '7mzrIsaAjnXihW3InKjlC3'; // Replace with Taylor Swift's first album ID

//const songList = document.getElementById('songList');

app.get('/refresh_token');
axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
    headers: {
        'Authorization': `Bearer ${'access_token'}`
    },
    params: {
        limit: 50
    }
})
    .then(response => {
        const tracks = response.data.items;
        tracks.forEach(track => {
            const listItem = document.createElement('li');
            const trackName = document.createElement('span');
            trackName.textContent = track.name;

            const playButton = document.createElement('button');
            playButton.textContent = 'Play Preview';
            playButton.addEventListener('click', () => {
                playPreview(track.preview_url);
            });

            listItem.appendChild(trackName);
            listItem.appendChild(playButton);
            songList.appendChild(listItem);
        });
    })
    .catch(error => {
        console.error('Error fetching tracks:', error);
    });

function playPreview(previewUrl) {
    const audio = new Audio(previewUrl);
    audio.play();
}



console.log('Listening on 3000');
app.listen(3000);









