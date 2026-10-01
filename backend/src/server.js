require("dotenv").config();

const express = require("express");
const cors = require("cors");

const candidatosRoutes = require("./routes/candidatos");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/candidatos", candidatosRoutes);

app.get("/", (req, res) => {
  res.json({
    mensagem: "JMS - Pesquisa Eleições 2026 funcionando!"
  });
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Servidor JMS rodando em http://localhost:${PORT}`);
});