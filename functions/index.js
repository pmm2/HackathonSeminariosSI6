const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const usuariosCollection = db.collection('usuarios');

const userId = '1';

exports.agendar = functions.https.onRequest(async (req, res) => {
  try {
    const nomeUsuario = "João Pedro";
    let doc = await usuariosCollection.doc(userId).get();

    if (!doc.exists) {
      await usuariosCollection.doc(userId).set({
        dentro: false,
        momentoEntrada: null,
        nome: nomeUsuario,
        tempoRestante: 100,
        tempoTotal: 100,
      });
      doc = await usuariosCollection.doc(userId).get();
    }

    const userData = doc.data();
    const dentro = userData.dentro || false;

    const agora = admin.firestore.Timestamp.now();

    if (dentro) {
      // Calcula o tempo decorrido e atualiza o tempo restante
      const tempoDecorrido = Math.floor(
        (agora.toMillis() - userData.momentoEntrada.toMillis()) / (1000 * 60)
      ); // Tempo decorrido em minutos
      let tempoRestante = userData.tempoRestante - tempoDecorrido;
      if (tempoRestante < 0) {
        tempoRestante = 0;
      }

      await usuariosCollection.doc(userId).update({
        dentro: false,
        momentoEntrada: null,
        tempoRestante: tempoRestante,
      });

      res.status(200).json({
        message: "Saída da sala registrada com sucesso",
        tempoRestante: tempoRestante,
      });
    } else {
      // Registra a entrada na sala
      await usuariosCollection.doc(userId).update({
        dentro: true,
        momentoEntrada: agora,
      });

      res
        .status(200)
        .json({ message: "Entrada na sala registrada com sucesso" });
    }
  } catch (error) {
    console.error("Erro ao registrar entrada/saída na sala:", error);
    res.status(500).json({ error: "Erro ao registrar entrada/saída na sala" });
  }
});

exports.check = functions.https.onRequest(async (req, res) => {
  try {
    let doc = await usuariosCollection.doc(userId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const userData = doc.data();
    let tempoRestante = 0;
    let dentro = false;
    const agora = admin.firestore.Timestamp.now();

    if (userData.dentro) {
      // Se o usuário estiver dentro, calcula o tempo restante
      const momentoEntrada = userData.momentoEntrada.toMillis(); // Convertendo o momento de entrada para milissegundos
      const tempoDecorrido = Math.floor(
        (agora.toMillis() - momentoEntrada) / (1000 * 60)
      ); // Tempo decorrido em minutos
      const tempoTotal = userData.tempoTotal; // Tempo total do usuário
      tempoRestante = userData.tempoRestante - tempoDecorrido;
      if (tempoRestante < 0) {
        tempoRestante = 0;
        dentro = false;

        await usuariosCollection.doc(userId).update({
          dentro: dentro,
          tempoRestante: tempoRestante,
        });
    
      } else {
        dentro = true;
      }
    } else {
      // Se o usuário estiver fora, retorna o tempo limite
      tempoRestante = userData.tempoRestante;
    }

    res.status(200).json({
      dentro: dentro,
      tempoRestante: tempoRestante,
      nome: userData.nome,
    });
  } catch (error) {
    console.error("Erro ao verificar tempo limite:", error);
    res.status(500).json({ error: "Erro ao verificar tempo limite" });
  }
});
