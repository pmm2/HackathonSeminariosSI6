const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const usuariosCollection = db.collection("usuarios");

app.get("/register", async (req, res) => {
  try {
    const userId = "1";
    const nomeUsuario = "João";
    let doc = await usuariosCollection.doc(userId).get();

    if (!doc.exists) {
      await usuariosCollection.doc(userId).set({
        dentro: false,
        entrada_saida: null,
        tempo_limite: null,
        nome: nomeUsuario,
      });
      doc = await usuariosCollection.doc(userId).get();
    }

    const userData = doc.data();
    const dentro = userData.dentro || false;

    const agora = admin.firestore.Timestamp.now();
    const tempoLimite = agora.toDate();
    tempoLimite.setMinutes(tempoLimite.getMinutes() + 10);

    await usuariosCollection.doc(userId).set({
      dentro: !dentro,
      entrada_saida: agora,
      tempo_limite: tempoLimite,
      nome: nomeUsuario,
    });

    res.status(200).json({ message: "Registro efetuado com sucesso" });
  } catch (error) {
    console.error("Erro ao registrar entrada/saída:", error);
    res.status(500).json({ error: "Erro ao registrar entrada/saída" });
  }
});

app.get("/checkUser", async (req, res) => {
  try {
    const userId = "unico_usuario";
    let doc = await usuariosCollection.doc(userId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const userData = doc.data();
    const dentro = userData.dentro || false;

    const { tempo_limite } = userData;
    const tempoLimite = tempo_limite.toDate();

    const agora = new Date();
    const tempoLimitePassado = agora > tempoLimite;

    if (tempoLimitePassado && dentro) {
      await usuariosCollection.doc(userId).update({ dentro: false });
    }

    res
      .status(200)
      .json({ dentro: dentro, tempo_limite: tempoLimite, nome: userData.nome });
  } catch (error) {
    console.error("Erro ao verificar tempo limite:", error);
    res.status(500).json({ error: "Erro ao verificar tempo limite" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
