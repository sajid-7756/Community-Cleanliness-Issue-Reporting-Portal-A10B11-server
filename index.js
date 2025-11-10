const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@communitycleanliness.k81hyem.mongodb.net/?appName=CommunityCleanliness`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Smart server is running");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("issue_report");
    const issueCollection = db.collection("issues");
    const contributionCollection = db.collection("contribution");
    const usersCollection = db.collection("users");

    // USERS APIs
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        res.send({
          message: "user already exits. do not need to insert again",
        });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    //issue related APIs
    app.post("/issues", async (req, res) => {
      const newIssue = req.body;
      const result = await issueCollection.insertOne(newIssue);
      res.send(result);
    });

    app.get("/issues", async (req, res) => {
      const { email, category, status } = req.query;
      const query = {};
      if (email) {
        query.email = email;
      }
      if (category && category !== 'all') {
        query.category = category;
      }
      if (status && status !== 'all') {
        query.status = status;
      }

      console.log(query)

      const cursor = issueCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch("/issues/:id", async (req, res) => {
      const id = req.params.id;
      const updatedIssue = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          ...updatedIssue,
        },
      };
      const options = {};
      const result = await issueCollection.updateOne(query, update, options);
      res.send(result);
    });

    app.get("/latest-issues", async (req, res) => {
      const query = { status: { $exists: true } };
      const projectFields = {
        _id: 1,
        title: 1,
        description: 1,
        category: 1,
        location: 1,
        image: 1,
        email: 1,
      };

      const cursor = issueCollection
        .find(query)
        .project(projectFields)
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/issues/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await issueCollection.findOne(query);
      res.send(result);
    });

    app.delete("/issues/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await issueCollection.deleteOne(query);
      res.send(result);
    });

    //contribution related APIs
    app.post("/contributions", async (req, res) => {
      const newContribution = req.body;
      const result = await contributionCollection.insertOne(newContribution);
      res.send(result);
    });

    app.get("/contributions/:id", async (req, res) => {
      const id = req.params.id;
      const query = { issueId: id };
      const cursor = contributionCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/contributions", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const cursor = contributionCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Smart server is running on port: ${port}`);
});
