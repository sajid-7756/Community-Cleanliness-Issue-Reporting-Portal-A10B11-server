const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    //issue related APIs
    app.post("/issues", async (req, res) => {
      const newIssue = req.body;
      const result = await issueCollection.insertOne(newIssue);
      res.send(result);
    });

    app.get("/latest-issues", async (req, res) => {
      const projectFields = {
        title: 1,
        description: 1,
        category: 1,
        location: 1,
        image: 1,
      };
      const query = issueCollection
        .find()
        .limit(6)
        .skip(7)
        .project(projectFields);
      const result = await query.toArray();
      res.send(result);
    });

    app.get("/issues", async (req, res) => {
      const cursor = issueCollection.find();
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
