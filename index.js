const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')

const app = express()
const port = process.env.PORT || 5000



// middleware
app.use(cors())
app.use(express.json())



app.get('/', (req, res) => {
    res.send('Server is running...')
})

// verify user with JWT
function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('Unauthorized Access!')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.TOKEN_SECRET, function(err, decoded){
        if(err){
            return res.status(401).send('Unauthorized Access!')
        }
        req.decoded = decoded;
        next()
    })
}



const uri = process.env.DB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        const usersCollection = client.db('motocross').collection('users')
        const categoriesCollection = client.db('motocross').collection('categories')
        const allBikesCollection = client.db('motocross').collection('allBikes')
        const bookingsCollection = client.db('motocross').collection('bookings')

// set or update user to database  
        app.put('/users/:email', async(req, res)=>{
            const user = req.body;
            const email = req.params.email;
            const filter = { email: email };
            const option = { upsert: true};
            const updatedDoc = {
                $set: user 
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);

            const token = jwt.sign(user, process.env.TOKEN_SECRET, {expiresIn: '1d'});

            res.send({user, token})
        })
// get all users
        app.get('/users', async(req, res)=> {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })
// get user by email
        app.get('/users/:email', async(req, res) => {
            const email = req.params.email;
            const query = { email: email};
            const user = await usersCollection.findOne(query);
            res.send(user)
        })

// set seller role to user
        app.put('/users/seller/:id', verifyJWT, async(req, res) => {

            const decodedEmail = req.decoded.email;
            const query = { email : decodedEmail };
            const user = await usersCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send('Forbidden Access!')
            }
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updatedDoc = {
                $set: { role: 'seller'}
            }
            const result =await usersCollection.updateOne(filter, updatedDoc, option)
            res.send(result)

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

//find one bike 
        app.get('/bike/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id)}
            const result = await allBikesCollection.findOne(query)
            res.send(result)


        })

// get bookings with user email
        app.get('/bookings',verifyJWT, async(req, res) => {
           
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if(email !== decodedEmail) {
                return res.status(403).send('Forbidden!')
            }
            const query = { email: email }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result)
        })
// post bookings with user info
        app.post('/bookings', async(req, res) => {
            const product = req.body;
            const result = await bookingsCollection.insertOne(product);
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
  