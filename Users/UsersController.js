const bcrypt = require('bcrypt');

class UsersController {

    constructor(app, dbConnection) {
        this.app = app;
        this.dbConnection = dbConnection;
        this.retrieveAllUser();
        this.retrieveUserByUsername();
        this.insertUser();
        this.checkUser();
    }

    retrieveAllUser() {
        this.app.get('/api/retrieve/users', async (req, res) => {
            try {
                this.dbConnection.query(`SELECT * FROM innodb.T_USERS`, function (err, rows, fields) {
                    if (err) throw err
                    res.json(rows);
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    }

    retrieveUserByUsername() {
        this.app.post('/api/retrieve/usersByUsername', async (req, res) => {
            try {
                this.dbConnection.query(`SELECT * FROM innodb.T_USERS as u WHERE USERNAME = '${req.body.username}' `, function (err, rows, fields) {
                    if (err) throw err
                    if (rows.length > 0) {
                        res.json({ rows });
                    } else {
                        res.status(404).json({ error: "USER NOT FOUND :(" });
                    }
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    }

    checkUser(){
        this.app.post('/api/login/user', async (req, res) => {
            try {
                this.dbConnection.query(`SELECT * FROM innodb.T_USERS WHERE EMAIL = "${req.body.email}";`, async function (err, rows, fields) {
                    if (err) {
                        res.status(500).json({ error: 'Errore durante la chiamata' + err });
                        return;
                    } else{
                        if(rows.length > 0){
                            if(await bcrypt.compare(req.body.password,rows[0].PASSWORD)){
                                res.status(200).json({login: true, user: { email: rows[0].EMAIL, username: rows[0].USERNAME}})
                            } else{
                                res.status(404).json({login: false})
                            }
                        } else{
                            res.status(404).json({error: "EMAIL NON ESISTENTE"})
                        }
                    }
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    }

    insertUser() {
        this.app.put('/api/insert/user', async (req, res) => {
            try {
                this.dbConnection.query(`INSERT INTO innodb.T_USERS (USERNAME, EMAIL, PASSWORD) VALUES ("${req.body.username}", "${req.body.email}", "${req.body.password}");`, function (err, rows, fields) {
                    if (err) {
                        if (err.sqlMessage.includes("UNIQUE_USER")) {
                            res.status(400).json({ error: "USERNAME GIA' PRESENTE" });
                            return;
                        } 
                        if (err.sqlMessage.includes("UNIQUE_EMAIL")) {
                            res.status(400).json({ error: "EMAIL GIA' PRESENTE" });
                            return;
                        } 
                        else {
                            res.status(500).json({ error: 'Errore durante l\'inserimento' });
                            return;
                        }
                    } else {
                        res.status(200).json({ success: true });
                    }
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    }
}

module.exports = UsersController;