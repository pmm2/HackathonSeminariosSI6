const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Inicializa o Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const usuariosCollection = db.collection('usuarios');

// Endpoint para registrar a entrada ou saída do usuário
app.post('/registrar', async (req, res) => {
  try {
    // Define o ID do usuário (pode ser fixo, já que você mencionou que haverá apenas um usuário)
    const userId = 'unico_usuario';

    // Define o nome do usuário
    const nomeUsuario = 'João';

    // Obtém o estado atual do usuário
    const doc = await usuariosCollection.doc(userId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    const userData = doc.data();
    const dentro = userData.dentro || false;

    // Define a data e hora atual como entrada ou saída do usuário
    const agora = admin.firestore.Timestamp.now();
    const tempoLimite = agora.toDate();
    tempoLimite.setHours(tempoLimite.getHours() + 1);

    // Atualiza o documento do usuário com os dados de entrada/saída, tempo limite e nome
    await usuariosCollection.doc(userId).set({
      dentro: !dentro, // Inverte o estado atual (entra se estava fora e sai se estava dentro)
      entrada_saida: agora,
      tempo_limite: tempoLimite,
      nome: nomeUsuario
    });

    res.status(200).json({ message: 'Registro efetuado com sucesso' });
  } catch (error) {
    console.error('Erro ao registrar entrada/saída:', error);
    res.status(500).json({ error: 'Erro ao registrar entrada/saída' });
  }
});

// Endpoint para verificar se o usuário passou do tempo limite e atualizar automaticamente o estado
app.get('/verificar-tempo-limite', async (req, res) => {
  try {
    // Define o ID do usuário (o mesmo usado para registrar entrada/saída)
    const userId = 'unico_usuario';

    // Obtém o documento do usuário
    const doc = await usuariosCollection.doc(userId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    const userData = doc.data();

    // Verifica se o usuário está dentro
    const dentro = userData.dentro || false;

    // Obtém o tempo limite do documento do usuário
    const { tempo_limite } = userData;
    const tempoLimite = tempo_limite.toDate();

    // Verifica se o tempo limite já passou
    const agora = new Date();
    const tempoLimitePassado = agora > tempoLimite;

    // Atualiza automaticamente o estado "dentro" se o tempo limite passou
    if (tempoLimitePassado && dentro) {
      await usuariosCollection.doc(userId).update({ dentro: false });
    }

    // Retorna informações incluindo o nome do usuário
    res.status(200).json({ dentro: dentro, tempo_limite: tempoLimite, nome: userData.nome });
  } catch (error) {
    console.error('Erro ao verificar tempo limite:', error);
    res.status(500).json({ error: 'Erro ao verificar tempo limite' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
