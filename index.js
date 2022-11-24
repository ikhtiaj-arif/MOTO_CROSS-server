const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken')

const app = express()
const port = process.env.PORT || 5000



// middleware
app.use(cors())
app.use(express.json())



app.get('/', (req, res) => {
    res.send('Server is running...')
})




const uri = process.env.DB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        const usersCollection = client.db('motocross').collection('users')
        const categoriesCollection = client.db('motocross').collection('categories')
        const allBikesCollection = client.db('motocross').collection('allBikes')
// set or update user to database  
        app.put('/users/:email', async(req, res)=>{
            const user = req.body;
            const email = req.params.email;
            const filter = { email: email };
            const option = { upsert: true};
            const updatedDoc = {
                $set: { user }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);

            const token = jwt.sign(user, process.env.TOKEN_SECRET, {expiresIn: '1d'});

            res.send({user, token})
        })


// All categories
        app.get('/categories', async(req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result)
        })

// filter bikes by category name
        app.get('/categories/:title', async(req, res)=>{
            const title = req.params.title;
            console.log(title);
            const filter = { title: title };
            const result = await allBikesCollection.find(filter).toArray();
            res.send(result)
        })







    }
    finally{

    }
}
run().catch(e => console.dir(e))

  
  
  app.listen(port, () => {
    console.log(`Server is running...on ${port}`)
  })
  