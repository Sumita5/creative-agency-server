const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const fileUpload = require('express-fileupload');
const admin = require('firebase-admin');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kw1ff.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(fileUpload());
var serviceAccount = require("./configs/creative-agency-service-firebase-adminsdk-hajb2-ad38b80f36.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIRE_DB
});
const port = 5000

app.get('/', (req, res) => {
    res.send('Hello World!')
})



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    console.log('database connected');
    const serviceCollection = client.db("creativeAgency").collection("services");
    const reviewCollection = client.db("creativeAgency").collection("reviews");
    const adminCollection = client.db("creativeAgency").collection("admins");
    const orderCollection = client.db("creativeAgency").collection("orders");

    app.post('/addService', (req, res) => {
        const title = req.body.title;
        const description = req.body.description;
        const file = req.files.file;
        const newImg = file.data;
        const encImg = newImg.toString('base64');
        var image = {
            contentType: req.files.file.mimetype,
            size: req.files.file.size,
            img: Buffer.from(encImg, 'base64')
        };
        serviceCollection.insertOne({ title, description, image })
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    app.get('/services', (req, res) => {
        serviceCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })
    app.get('/getServiceById', (req, res) => { 
        serviceCollection.find({ _id: ObjectId(req.query.id) })
            .toArray((err, documents) => {
                res.status(200).send(documents[0]);
            })
    });

    app.post('/addReview', (req, res) => {
        const newReview = req.body;
        reviewCollection.insertOne(newReview)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    app.get('/reviews', (req, res) => {
        reviewCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.post('/makeAdmin', (req, res) => {
        const newAdmin = req.body;
        adminCollection.insertOne(newAdmin)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })
    app.post('/placeOrder', (req, res) => {
        const name = req.body.name;
        const email = req.body.email;
        const title = req.body.title;
        const projectDetails = req.body.projectDetails;
        const price = req.body.price;
        const serviceId = req.body.serviceId;
        const status = 'Pending';
        if (req.files) {
            const file = req.files.file;
            const newImg = file.data;
            const encImg = newImg.toString('base64');

            var projectFile = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer.from(encImg, 'base64')
            };
            orderCollection.insertOne({ projectFile, name, email, title, projectDetails, price, serviceId, status })
                .then(result => {
                    res.send(result.insertedCount > 0)
                })
        }
        else {
            orderCollection.insertOne({ name, email, title, projectDetails, price, serviceId, status })
                .then(result => {
                    res.send(result.insertedCount > 0)
                })
        }
    })
    app.get('/orders', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    if (tokenEmail == queryEmail) {
                        orderCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            })
                    }
                }).catch(function (error) {
                    res.status(401).send('Un authorized access')
                });
        }
        else {
            res.status(401).send('Un authorized access')
        }
    })
    app.get('/allOrders', (req, res) => {
        orderCollection.find({})
            .toArray((err, documents) => {
                res.send(documents)
            })
    })
    
    app.post('/isAdmin', (req, res) => {
        const email = req.body.email;
        adminCollection.find({ email: email })
            .toArray((err, admins) => {
                res.send(admins.length > 0)
            })
    })
    app.patch("/update/:id", (req, res) => {
        orderCollection.updateOne(
            { _id: ObjectId(req.params.id) },
            {
                $set: { status: req.body.status }
            })
            .then(result => {
                res.send(result.modifiedCount > 0);
            })
    })

});

app.listen(process.env.PORT || port)
