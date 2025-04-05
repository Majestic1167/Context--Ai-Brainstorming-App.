import express from "express"; // importação do pacote express em syntax module
const app = express();

import collection from "./mongodb.js";

import path from "path"; // Importa o módulo 'path' do Node.js para lidar com caminhos de ficheiros e diretórios.
import { fileURLToPath } from "url"; // Importa a função 'fileURLToPath' do módulo 'url' para converter URLs de ficheiro em caminhos de ficheiro.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // apanha o diretório de execução do ficheiro

app.set("view engine", "ejs"); //método para configurar a nossa view engine para “ejs”

app.use(express.static(__dirname + "/public")); //é uma função middleware no framework Express.js para Node.js que serve arquivos estáticos, como imagens, arquivos CSS e JavaScript.
app.use(express.urlencoded({ extended: true })); //é uma função middleware do Express.js que é usada para analisar dados de formulários HTML que são enviados para o servidor.

import homeroutes from "./routes/Homeroutes.js"; // importação do arquivo de rotas
app.use("/", homeroutes); // uso da função de rotas

import authentication from "./routes/Authentication.js"; // importação do arquivo de rotas
app.use("/", authentication); // uso da função de rotas

import session from "./routes/Session.js"; // importação do arquivo de rotas
app.use("/", session); // uso da função de rotas

import user from "./routes/User.js"; // importação do arquivo de rotas
app.use("/", user); // uso da função de rotas

app.listen(3000, (err) => {
  if (err) console.error(err);
  else console.log("Server listening on PORT", 3000);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  // Handle login logic (authentication)
  res.send("Login successful!");
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    await collection.insertMany([{ name, email, password }]);
    res.render("home");
  } catch (err) {
    console.error(err);
    res.status(500).send("Signup failed!");
  }
});
