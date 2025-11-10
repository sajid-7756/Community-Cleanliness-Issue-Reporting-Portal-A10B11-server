const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./a10-community-issue-report-firebase-adminsdk.json");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.token_email = decoded.email;
    next();
  } catch {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

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
    app.post("/issues", verifyFirebaseToken, async (req, res) => {
      const newIssue = req.body;
      const result = await issueCollection.insertOne(newIssue);
      res.send(result);
    });

    app.get("/myIssue", verifyFirebaseToken, async (req, res) => {
      const { email } = req.query;

      const query = {};
      if (email) {
        query.email = email;
        if (req.token_email !== email) {
          return res.status(401).send({ message: "forbidden access" });
        }
      }

      const cursor = issueCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/issues", async (req, res) => {
      const { category, status } = req.query;
      const query = {};

      if (category && category !== "all") {
        query.category = category;
      }
      if (status && status !== "all") {
        query.status = status;
      }

      const cursor = issueCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch("/issues/:id", verifyFirebaseToken, async (req, res) => {
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

    app.delete("/issues/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await issueCollection.deleteOne(query);
      res.send(result);
    });

    //contribution related APIs
    app.post("/contributions", verifyFirebaseToken, async (req, res) => {
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

    app.get("/contributions", verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
        if (req.token_email !== email) {
          return res.status(403).send({ message: "forbidden access" });
        }
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
  console.log(`Server is running on port: ${port}`);
});
