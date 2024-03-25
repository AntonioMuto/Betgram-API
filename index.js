const dotenv = require('dotenv');
dotenv.config();
const AWS = require('aws-sdk');
var express = require('express');
const request = require('request');
var app = express();

const TOKEN = process.env.TOKEN;

app.listen(process.env.PORT);

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  s3ForcePathStyle: true
});

//DATABASE RDS AWS
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
});

connection.end();



app.get('/', async function (req, res) {
  let complete = await getFile('esemp');
  res.json({ response: complete });
});

app.get('/api/read/:nome', async function (req, res) {
  try {
    const content = await getFile(req.params.nome);
    res.json({ response: content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/insert/:data', async function (req, res) {
  try {
    var arrayDataCompleto = [];
    callApiMatch(req.params.data, arrayDataCompleto)
      .then(async (apiResponse) => {
        if (apiResponse.length > 0) {
          var content = JSON.stringify(apiResponse, null, 2);
          var jsonRes = JSON.parse(content);
          var result = await insertFile(`${req.params.data}`, jsonRes);
          !result ? res.json({ response: `Match aggiunto ${req.params.data}.json` }) : res.json({ error: "IMPOSSIBILE AGGIUNGERE IL FILE" })
        } else {
          res.json(JSON.parse(`{"LOGAPI": "NESSUN MATCH PER OGGI, FILE NON CREATO"}`));
        }
      })
      .catch((error) => {
        res.json(JSON.parse(`{"errorAPI": ${error}}`));
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


async function insertFile(name, context) {
  var result = await new Promise(async (resolve, reject) => {
    var up = await upload(process.env.AWS_BUCKET_MATCH, name,context)
    if (!up) {
      resolve(false)
    } else {
      resolve(true)
    }
  });
  return result;
}

async function upload(bucket, name, content) {
  var result = await new Promise(async (resolve, reject) => {
    var params = {
      Bucket: bucket,
      Key: name,
      Body: JSON.stringify(content),
      ContentType: 'application/json'
    };
    s3.putObject(params, function (error, data) {
      if (error) {
        console.error(error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
    return result;
  });
}

async function getFile(name) {
  var result = await new Promise(async (resolve, reject) => {
    Download("matchbyday", name, function (jsonContent) {
      if (jsonContent === "Error!") {
        resolve(JSON.parse('{"error": "ERRORE NEL RECUPER DEL MATCH :("}'))
      } else {
        resolve(jsonContent);
      }
    });
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


function Download(bucket, key, callback) {
  var params = {
    Key: key,
    Bucket: bucket
  };
  try {
    s3.getObject(params, function (error, data) {
      if(data === null){
        return callback(JSON.parse('{"error": "NESSUN MATCH TROVATO PER QUESTA DATA"}'))
      }
      if (error) {
        return callback(JSON.parse('{"error": "ERRORE NELLA LETTURA DEL MEATCH"}'))
      } else {
        var jsonContent = JSON.parse(data.Body.toString('utf-8'));
        return callback(jsonContent);
      }
    });
  } catch (error) {
    console.error(error);
    return callback("Error!");
  }
}
