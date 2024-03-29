const dotenv = require('dotenv');
var Storage = require('megajs');
var File = require('megajs');
var express = require('express');
const request = require('request');
const Comment = require('./Comments/Comment');
const InitializerMega = require('./Initializers/InitializerMega');
const MegaAPI = require('./MegaApi');
const UsersController = require('./Users/UsersController')

var app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
dotenv.config();
const TOKEN = process.env.TOKEN;

var mysql = require('mysql');

var connection = mysql.createConnection({
  host     : process.env.RDS_HOSTNAME,
  user     : process.env.RDS_USERNAME,
  password : process.env.RDS_PASSWORD,
  port     : process.env.RDS_PORT
});

connection.connect(function(err) {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }

  console.log('Connected to database.');
  new UsersController(app,connection);
});

const storage = new Storage({
    email: process.env.EMAIL_MEGA,
    password: process.env.PASSWORD_MEGA
})


storage.once('ready', async () => {
    console.log(`LOGGED`);
    await InitializerMega.initializeFolders(storage);
});

app.listen(process.env.PORT);

app.get('/', function (req, res) {
    res.send(InitializerMega.commentsFolder);
});

app.get('/api/search/:nome', async function (req, res) {
    try {
        const content = await getFile(req.params.nome);
        res.json({ response: content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/search/comments/:nome', async function (req, res) {
    try {
        let element = await MegaAPI.findElementInFolder(InitializerMega.commentsFolder,req.params.nome);
        const content = await MegaAPI.readElement(element);        
        res.json({ response: content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/exist/:nome', async function (req, res) {
    try {
        const content = await isFileAlredyHere(req.params.nome);
        if (content) {
            res.json({ response: content });
        } else {
            res.status(404).json({ error: '404 NOT FOUND' })
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/try', async function (req, res) {
    try {
        MegaAPI.retrieveCurrentCommentId();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/upload', async function (req, res) {
    try {
        const upl = await insertFile("comments", '{"comments": [{"text": "grande"}]}');
        upl ? res.json({ response: "FILE AGGIUNTO CON SUCCESSO" }) : res.json({ response: "ERRORE NEL CARICAMENTO" })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/upload/comment', async function (req, res) {
    try {
        let idComment = await MegaAPI.retrieveCurrentCommentId();
        if(idComment === null){
            res.json({ response: "ERRORE NELL'UPDATE DEL NUOVO ID" });
            return;
        }
        let newComment = new Comment(idComment, req.body.idPost, req.body.userId, req.body.userName, req.body.content, req.body.answerTo);
        const historyComments = await newComment.isNewComment(req.body.idPost);
        const upl = historyComments ? await MegaAPI.uploadComment(InitializerMega.commentsFolder, req.body.idPost, newComment) : await MegaAPI.updateComments(req.body.idPost,newComment);
        upl ? res.json({ response: "FILE AGGIUNTO CON SUCCESSO" }) : res.json({ response: "ERRORE NEL CARICAMENTO" })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/insert/:data', async function (req, res) {
    try {
        const content = await isFileAlredyHere(req.params.nome);
        if (content) {
            res.json({ error: 'File già esistente' })
        } else {
            var arrayDataCompleto = [];
            callApiMatch(req.params.data, arrayDataCompleto)
                .then(async (apiResponse) => {
                    if (apiResponse.length > 0) {
                        var content = JSON.stringify(apiResponse, null, 2);
                        var result = await insertFile(`${req.params.data}`, content);
                        result ? res.json({ response: `Match aggiunto ${req.params.data}.json` }) : res.json({ error: "IMPOSSIBILE AGGIUNGERE IL FILE" })
                    } else {
                        res.send('Nessun Match per oggi, file non creato');
                    }
                })
                .catch((error) => {
                    console.log(error)
                });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

async function addComment(){
    return true;
}

async function isFileAlredyHere(name) {
    var result = await new Promise(async (resolve, reject) => {
        const folder = File.File.fromURL('https://mega.nz/folder/5msEVB4K#NaIdfyjhyu_lOQxyj4rhNw')
        await folder.loadAttributes()
        const file = folder.children.find(file => file.name === `${name}.json`)
        if (file === undefined) {
            resolve(false);
        } else {
            resolve(true);
        }
    });
    return result;
}

async function insertFile(name, context) {
    var result = await new Promise(async (resolve, reject) => {
        const folder = File.File.fromURL(process.env.UTILITY_FOLDER);
        const uploadedFile = await folder.root.upload('myfile.txt', 'Hello world!').complete
        fs.createReadStream('myfile.txt').pipe(folder.upload('myfile.txt'))
        folder.upload('myfile.txt', 'Hello world!', (error, uploadedFile) => {
        })

    });
    return result;
}

async function insertComments(name, context) {
    var result = await new Promise(async (resolve, reject) => {
        const file = storage.root.children.find(file => file.name === `${name}.json`)
        if (file === undefined) {
            const fileup = await storage.upload(`${name}.json`, context).complete
            if (fileup === undefined) {
                resolve(false)
            } else {
                resolve(true);
            }
        } else {
            file.delete();
            const fileup = await storage.upload(`${name}.json`, context).complete
            if (fileup === undefined) {
                resolve(false)
            } else {
                resolve(true);
            }
        }
    });
    return result;
}

async function getFile(name) {
    var result = await new Promise(async (resolve, reject) => {
        const file = await MegaAPI.findElementInFolder(process.env.UTILITY_FOLDER,name);
        if (file === undefined) {
            resolve("404 NOT FOUND")
        } else {
            file.downloadBuffer((error, data) => {
                if (error) {
                    console.error(error);
                } else {
                    const jsonString = data.toString('utf8');
                    const parsedData = JSON.parse(jsonString);
                    resolve(parsedData);
                }
            });
        }
    });
    return result;
}

async function getFileComment(name) {
    var result = await new Promise(async (resolve, reject) => {
        const file = storage.root.children.find(file => file.name === `${name}.json`)
        if (file === undefined) {
            resolve("404 NOT FOUND")
        } else {
            file.downloadBuffer((error, data) => {
                if (error) {
                    console.error(error);
                } else {
                    const jsonString = data.toString('utf8');
                    const parsedData = JSON.parse(jsonString);
                    resolve(parsedData);
                }
            });
        }
    });
    return result;
}

async function callApiMatch(date, arrayDataCompleto) {
    var end = false;
    for (var i = 1; i < 20 && !end; i++) {
        await new Promise((resolve, reject) => {
            const url = `https://api.sportmonks.com/v3/football/fixtures/date/${date}?api_token=${TOKEN}&include=round:name;league:id;coaches:common_name,image_path;coaches;league:id;participants;scores;venue:name,capacity,image_path,city_name;state;lineups.player:common_name,image_path;events;comments;lineups.player:common_name,image_path;events;comments;statistics:data,participant_id;periods;metadata;&filters=fixtureLeagues:384,387,564,462,72,82,301,8,2;MetaDataTypes:159,161,162;fixtureStatisticTypes:54,86,45,41,56,42,39,51,34,80,58,57&page=${i}&timezone=Europe/Rome`;
            request.get({ url }, (error, response, body) => {
                if (error) {
                    console.error('Errore nella richiesta HTTP:', error);
                    reject(error);
                } else {
                    var res = JSON.parse(response.body);
                    if (res.pagination && res.pagination.has_more === false) {
                        end = true;
                        resolve(arrayDataCompleto);
                    }
                    for (var match of res.data || []) {
                        arrayDataCompleto.push(match);
                    }
                    resolve(arrayDataCompleto);
                }
            })
        });
    }
    return new Promise((resolve, reject) => {
        resolve(arrayDataCompleto);
    });
}