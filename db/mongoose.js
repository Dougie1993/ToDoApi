//this file will handle mongoDB connection Logic

const mongoose = require('mongoose')
mongoose.Promise = global.Promise
mongoose.connect('mongodb://localhost:27017/TaskManager', {useNewUrlParser: true})
.then(() => {
    console.log('Connected to db')
}).catch((e) => {
    console.log('Error while connecting to Db \n' + e)
})

//To prevent depracation warnings from MongoDB native driver
mongoose.set('useCreateIndex', true)
mongoose.set('useFindAndModify', false)

module.exports = {
    mongoose
}