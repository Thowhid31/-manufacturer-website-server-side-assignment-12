const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jqvdo.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      req.decoded = decoded;
      next();
    });
  }


async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('computer_mechanism').collection('products');
        const purchaseCollection = client.db('computer_mechanism').collection('purchase');
        const userCollection = client.db('computer_mechanism').collection('users');
        const orderCollection = client.db('computer_mechanism').collection('orders');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
              next()
            }
            else {
              res.status(403).send({ message: 'Forbidden' })
            }
          }

        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products)
        });

        app.get('/user', verifyJWT, async(req, res)=>{
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.delete('/user/:email', verifyJWT, verifyAdmin, async(req, res)=>{
            const email = req.params.email;
            const filter = {email: email}
            const users = await userCollection.deleteOne(filter)
            res.send(users);
        })



        app.get('/admin/:email', async(req, res)=>{
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin'
            res.send({admin: isAdmin})

        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({email: requester});
            if(requesterAccount.role === 'admin'){
                const filter = { email: email };  
            const updateDoc = {
                $set: {role: 'admin'},
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
            }
            else{
                res.status(403).send({message: 'Forbidden Access'})
            }
            
        })

        app.post('/orders', async(req, res)=> {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '30d'})
            res.send({result, token});
        })

        app.put('/user/update/:email', async (req, res)=> {
            const email = req.params.email;
            const user = req.body;
            const filter = {email: email};
            const options = {upsert: true};
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '30d'});
            res.send({result, token})
        })


        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
                ;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        })

    }
    finally {

    }
}

run().catch(console.log('Hello CM'))

app.get('/', (req, res) => {
    res.send('Hello From Computer Mechanism!')
})

app.listen(port, () => {
    console.log(`Computer listening on port ${port}`)
})