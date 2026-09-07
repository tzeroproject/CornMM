const express = require("express");
const path = require("path");

const app = express();
const dist = path.join(process.cwd(), "dist");

console.log("Serving static from:", dist);

app.use(express.static(dist));
app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(8081, () => console.log("Test server running on 8081"));
