const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET);
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
        return res.status(401).send('unauthorized Access!')
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
        const reportsCollection = client.db('motocross').collection('reports')
        const paymentsCollection = client.db('motocross').collection('payments')
        const blogsCollection = client.db('motocross').collection('blogs')



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
        app.get('/users', verifyJWT, async(req, res)=> {
            const query = {role: null};
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })
// get user by email
        app.get('/users/:email', verifyJWT, async(req, res) => {
            const email = req.params.email;
            const query = { email: email};
            const user = await usersCollection.findOne(query);
            res.send(user)
        })
//get user by role
        app.get('/seller',  async(req, res)=>{
            const filter = {role: "seller"}
            const result = await usersCollection.find(filter).toArray();
            // console.log(result);
            res.send(result)
        })
        app.get('/sellerRequested', verifyJWT, async(req, res)=>{
            const filter = {role: "sellerRequest"}
            const result = await usersCollection.find(filter).toArray();
            // console.log(result);
            res.send(result)
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
            const role = req.body;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updatedDoc = {
                $set: role
            }
            
            const result =await usersCollection.updateOne(filter, updatedDoc, option)
            res.send(result)

        })
// delete seller
        app.delete('/user/:id', verifyJWT, async(req, res)=>{
            const decodedEmail = req.decoded.email;
            const query = { email : decodedEmail };
            const user = await usersCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send('Forbidden Access!')
            }

            const id = req.params.id;
            const filter = { _id : ObjectId(id)}
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })

// All categories
        app.get('/categories', async(req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result)
        })

// filter bikes by category name & available
        app.get('/categories/:title', async(req, res)=>{
            const title = req.params.title;
            if(title === "ALLBIKES"){
                const filter = {status: 'available'}
                const result = await allBikesCollection.find(filter).toArray();
                res.send(result);
                return
            }
            // const filter = { title: title };
            const filter = {
                title: title ,
                 status: 'available' 
                };
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
// find bikes by seller email
        app.get('/bikes', verifyJWT, async(req, res)=> {
            const email = req.query.email;
            const query = {email: email};
            const result = await allBikesCollection.find(query).toArray();
            res.send(result)
        })

// update bike by email
        app.put('/bikes', async(req, res)=> {
            const email = req.query.email;

            const filter ={ email: email }
            const update = req.body;
            const option = { upsert: true }
            const updatedDoc = {
                $set: update 
            } 
            console.log('filter:',filter,'update:',update,'updoc:',updatedDoc);
            const result = await allBikesCollection.updateMany(filter, updatedDoc, option);
            console.log(result);
            res.send(result)
        })

// post bikes
        app.post('/bike', verifyJWT, async(req, res)=>{
            const product = req.body;
            console.log(req.body);
            const result = await allBikesCollection.insertOne(product);
            res.send(result)
        })

// delete bike
        app.delete('/bike/:id', verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const filter = { _id : ObjectId(id)}
            const result = await allBikesCollection.deleteOne(filter)
            res.send(result)
        })


// find bikes by advertisement 
        app.get('/advertiseBike', async(req, res)=> {
            
            const query = {isAdvertised: 'advertise'};
            const result = await allBikesCollection.find(query).toArray();
            res.send(result)
        })

        
// update advertise to bike
        app.put('/bike/:id', verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: ObjectId(id), status: "available" };
            const option = { upsert: true };
            const updatedDoc = {
                $set: data
            }
            const result =await allBikesCollection.updateOne(filter, updatedDoc, option)
            res.send(result) 
        })


// get reports
        app.get('/reports', verifyJWT, async(req, res)=>{
            const query = {}
            const result = await reportsCollection.find(query).toArray()
            res.send(result)
        })


//post report 

    app.post('/reports', verifyJWT, async(req, res)=>{
        const report = req.body;
        const result = await reportsCollection.insertOne(report)
        res.send(result)

    }) 

// delete repoert
        app.delete('/reports/:id', verifyJWT, async(req, res)=>{
            const decodedEmail = req.decoded.email;
            const query = { email : decodedEmail };
            const user = await usersCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send('Forbidden Access!')
            }
            const id = req.params.id;
            const filter = { _id : ObjectId(id)}
            const result = await reportsCollection.deleteOne(filter)
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
// get booking with id
        app.get('/bookings/:id', verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsCollection.findOne(query)
            res.send(result)
        })
// blogs
        app.get('/blogs',  async(req, res)=>{
            const query = {};
            const result = await blogsCollection.find(query).toArray()
            res.send(result)
        })
        


// post bookings with user info
        app.post('/bookings', verifyJWT, async(req, res) => {
            const product = req.body;
            const result = await bookingsCollection.insertOne(product);
            res.send(result)

        })

// delete booking
        app.delete('/bookings/:id', verifyJWT, async(req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query);
            res.send(result)
        })


// payment intent
        app.post('/create-payment-intent', verifyJWT, async(req, res)=>{
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
            
                "payment_method_types": [
                    "card"
                ]
                
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })
// payments data
        app.post('/payments', verifyJWT, async(req, res)=>{
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment)

            const bookingId = payment.bookingId;
            const productId = payment.productId;

            const bookingFilter = { _id: ObjectId(bookingId)}
            const productFilter = { _id: ObjectId(productId)}
            
            const bookingUpdateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const productUpdateDoc = {
                $set: {
                    status: 'sold',
                    isAdvertised: null
                }
            }
            const updatedBooking = await bookingsCollection.updateOne(bookingFilter, bookingUpdateDoc);
            const updatedProduct = await allBikesCollection.updateOne(productFilter, productUpdateDoc);

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
  