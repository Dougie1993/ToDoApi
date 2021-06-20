const express = require('express')
const app = express();
const {mongoose} = require('./db/mongoose')
const bodyParser = require('body-parser')

/*Load the mongoose models */
const Task  = require('./db/models/task.model')
const List = require('./db/models/list.model')
const User = require('./db/models/user.model')

/*Middle Ware */

/* Load Middleware */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/*Enable Cors */
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "*");
    // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PATCH, PUT, GET,POST, DELETE');
        return res.status(200).json({});
    }
    next();
  });

/* Verify Refresh Token Middleware which will verify the session */
let verifySession = (req, res, next) => {
    // Grab refresh token from header //
    let refreshToken = req.header('x-refresh-token');

    //grab id from the request header
    let _id = req.header('_id');


    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if(!user) {
            //user not found
            return Promise.reject({
                'err': 'User Not Found check if refresh token is valid and user id are correct'
            });
        }
        // user found & session valid
        req.user_id = user.id;
        req.refreshToken = refreshToken;
        req.userObject = user;

        //check if session has expired
        let isSessionValid = false;
        user.sessions.forEach((sessions) => {
            if (sessions.token === refreshToken) {
                //check if session has expired
                if(User.hasRefreshTokenExpired(sessions.expiresAt) === false) {
                    //refresh token has ot expired
                    isSessionValid = true;
                }
            }
        });
        if (isSessionValid) {
            //session is valid call next to continue processing webrequest
            next();
        } else {
            //session not valid
            return Promise.reject({
                'error': 'Refresh token has expired or session is invalid'
            })
        }

    }).catch((err) => {
        res.status(401).send(err);
    })
}

/* End of MiddleWare */

/* Routes */
app.get('/', (req, res) => {
    res.send('Hello World')
})

app.get('/lists', (req, res) => {
    //Get Array of all the lists in db
    List.find().then((lists) => {
        res.send(lists)
    }).catch((e) => {
        console.log('error')
    })
    

})


app.post('/lists', (req, res) => {
    //Create a new lists in db and return new list document
    let title = req.body.title

    let newList = new List({
        title
    })
    newList.save().then((listDoc) => {
        res.send(listDoc)
    })
    
})

app.patch('/lists/:id', (req, res) => {
    //Update a list in db and return updated list document
    List.findOneAndUpdate({ _id: req.params.id}, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200)  
    })
    
})

app.delete('/lists/:id', (req, res) => {
    //Remove a list item in db
    List.findOneAndRemove({_id: req.params.id}
        ).then((removedListDoc) => {
            res.send(removedListDoc)
        })
})

app.get('/lists/:listId/tasks', (req, res) => {
    //return task connected to a specific list
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks)
    })
})

app.get('/lists/:listId/tasks/:tasksId', (req, res) => {
    //return task connected to a specific list
    Task.findOne({
        _listId: req.params.listId,
        _id: req.params.tasksId
    }).then((task) => {
        res.send(task)
    })
})

app.post('/lists/:listId/tasks', (req, res) => {
    //create a new task connected to a specific list
    let title = req.body.title

    let newTask = new Task({
        title,
        _listId: req.params.listId 
    })
    newTask.save().then((newTaskDoc) => {
        res.send(newTaskDoc)
    })
})

app.patch('/lists/:listId/tasks/:taskId', (req, res) => {
    //update a specific task
    Task.findOneAndUpdate({ _id: req.params.taskId, _listId: req.params.listId}, {
        $set: req.body
    }).then(() => {
        res.send({ message: 'Updated Succesfully'}) 
    })
})

app.delete('/lists/:listId/tasks/:taskId', (req, res) => {
    Task.findByIdAndRemove({ _id: req.params.taskId, _listId: req.params.listId}).then((removeTaskDoc) => {
        res.send(removeTaskDoc)
    })
})

/* user routes */
// signup
app.post('/users', (req, res) => {
    // User sign up

    let body = req.body;
    let newUser = new User(body);

    newUser.save().then((savedUser) => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // Session created successfully - refreshToken returned.
        // now we geneate an access auth token for the user
        console.log('refresh token ' + refreshToken)
        return newUser.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken }
        });
    }).then((authTokens) => {
        // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
})

// Login

app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // Session created successfully - refreshToken returned.
            // now we generate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) => {
                // access auth token generated successfully, now we return an object containing the auth tokens
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
            // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
})

/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 */
 app.get('/users/me/access-token', verifySession, (req, res) => {
    // we know that the user/caller is authenticated and we have the user_id and user object available to us
    // now adding the accesstoken to the headers
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})

app.listen(3000, () => {
    console.log('we on Port 3000'); 
})
