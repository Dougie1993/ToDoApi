const express = require('express')
const app = express();
const {mongoose} = require('./db/mongoose')
const bodyParser = require('body-parser')

/*Load the mongoose models */
const Task  = require('./db/models/task.model')
const List = require('./db/models/list.model')

/* Load Middleware */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
        res.sendStatus(200)  
    })
})

app.delete('/lists/:listId/tasks/:taskId', (req, res) => {
    Task.findByIdAndRemove({ _id: req.params.taskId, _listId: req.params.listId}).then((removeTaskDoc) => {
        res.send(removeTaskDoc)
    })
})
app.listen(3000, () => {
    console.log('we on Port 3000'); 
})
