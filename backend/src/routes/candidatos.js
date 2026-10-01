const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const router = express.Router();

const autenticarAdmin = (req, res, next) => {
  const autorizacao = req.headers.authorization;

  if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
    return res.status(401).json({
      mensagem: "Acesso administrativo não autorizado.",
    });
  }

  const token = autorizacao.split(" ")[1];

  try {
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    next();
  } catch (error) {
    return res.status(401).json({
      mensagem: "Token administrativo inválido ou expirado.",
    });
  }
};

    router.get("/", async (req, res) => {
  try {
    const candidatos = await prisma.candidato.findMany({
      orderBy: {
        numero: "asc",
      },
    });

    res.json(candidatos);
  } catch (error) {
    console.error("Erro ao buscar candidatos:", error);
    res.status(500).json({
      mensagem: "Erro ao buscar candidatos.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nome, nomeUrna, numero, partido, cargo, uf } = req.body;

    if (!nome || !nomeUrna || !numero || !partido || !cargo || !uf) {
      return res.status(400).json({
        mensagem: "Todos os campos são obrigatórios.",
      });
    }

    const candidato = await prisma.candidato.create({
      data: {
        nome,
        nomeUrna,
        numero: Number(numero),
        partido,
        cargo,
        uf,
      },
    });

    res.status(201).json({
      mensagem: "Candidato cadastrado com sucesso.",
      candidato,
    });
  } catch (error) {
    console.error("Erro ao cadastrar candidato:", error);

    res.status(500).json({
      mensagem: "Erro ao cadastrar candidato.",
    });
  }
});

router.post("/:numero/votos", async (req, res) => {
  try {
    const numero = Number(req.params.numero);
    const { quantidade } = req.body;

    if (!Number.isInteger(numero)) {
      return res.status(400).json({
        mensagem: "Número do candidato inválido.",
      });
    }

    if (!Number.isInteger(Number(quantidade)) || Number(quantidade) <= 0) {
      return res.status(400).json({
        mensagem: "A quantidade de votos deve ser um número inteiro maior que zero.",
      });
    }

    const candidato = await prisma.candidato.findFirst({
      where: {
        numero,
      },
    });

    if (!candidato) {
      return res.status(404).json({
        mensagem: "Candidato não encontrado.",
      });
    }

    const lancamento = await prisma.lancamentoVoto.create({
      data: {
        candidatoId: candidato.id,
        quantidade: Number(quantidade),
      },
    });

    res.status(201).json({
      mensagem: "Votos lançados com sucesso.",
      lancamento,
    });
  } catch (error) {
    console.error("Erro ao lançar votos:", error);

    res.status(500).json({
      mensagem: "Erro ao lançar votos.",
    });
  }
});


router.get("/:numero/votos", async (req, res) => {
  try {
    const numero = Number(req.params.numero);

    if (!Number.isInteger(numero)) {
      return res.status(400).json({
        mensagem: "Número do candidato inválido.",
      });
    }

    const candidato = await prisma.candidato.findFirst({
      where: {
        numero,
      },
      include: {
        lancamentos: true,
      },
    });

    if (!candidato) {
      return res.status(404).json({
        mensagem: "Candidato não encontrado.",
      });
    }

    const totalVotos = candidato.lancamentos.reduce(
      (total, lancamento) => total + lancamento.quantidade,
      0
    );

    res.json({
      candidato: {
        id: candidato.id,
        nome: candidato.nome,
        nomeUrna: candidato.nomeUrna,
        numero: candidato.numero,
        partido: candidato.partido,
        cargo: candidato.cargo,
        uf: candidato.uf,
      },
      totalVotos,
      lancamentos: candidato.lancamentos,
    });
  } catch (error) {
    console.error("Erro ao consultar votos:", error);

    res.status(500).json({
      mensagem: "Erro ao consultar votos.",
    });
  }
});


router.post("/pesquisa/concluir", async (req, res) => {
  try {
    const {
      presidente,
      governador,
      senador1,
      senador2,
      deputadoFederal,
      deputadoEstadual,
    } = req.body;

    const votos = [
      { cargo: "PRESIDENTE", numero: presidente },
      { cargo: "GOVERNADOR", numero: governador },
      { cargo: "SENADOR", numero: senador1 },
      { cargo: "SENADOR", numero: senador2 },
      { cargo: "DEPUTADO FEDERAL", numero: deputadoFederal },
      { cargo: "DEPUTADO ESTADUAL", numero: deputadoEstadual },
    ];

    if (Number(senador1) === Number(senador2) && senador1 !== null && senador2 !== null) {
      return res.status(400).json({
        mensagem: "Os dois candidatos a senador devem ser diferentes.",
      });
    }

    const votosValidos = votos.filter(
      (voto) => voto.numero !== null
    );

    for (const voto of votosValidos) {
      if (!Number.isInteger(Number(voto.numero))) {
        return res.status(400).json({
          mensagem: `Número inválido para ${voto.cargo}.`,
        });
      }
    }

    const candidatos = [];

    for (const voto of votosValidos) {
      const candidato = await prisma.candidato.findFirst({
        where: {
          cargo: voto.cargo,
          numero: Number(voto.numero),
          ativo: true,
        },
      });

      if (!candidato) {
        return res.status(404).json({
          mensagem: `Candidato número ${voto.numero} não encontrado para o cargo ${voto.cargo}.`,
        });
      }

      candidatos.push(candidato);
    }

   const resultado = await prisma.$transaction([
  prisma.participacao.create({
    data: {},
  }),

  ...candidatos.map((candidato) =>
    prisma.lancamentoVoto.create({
      data: {
        candidatoId: candidato.id,
        quantidade: 1,
      },
    })
  ),
]);

const lancamentos = resultado.slice(1);

    res.status(201).json({
      mensagem: "Pesquisa registrada com sucesso.",
      quantidadeVotos: lancamentos.length,
    });
  } catch (error) {
    console.error("Erro ao concluir pesquisa:", error);

    res.status(500).json({
      mensagem: "Erro ao registrar a pesquisa.",
    });
  }
});

router.get("/buscar", async (req, res) => {
  try {
    const { cargo, numero } = req.query;

    if (!cargo || !numero) {
      return res.status(400).json({
        mensagem: "Informe o cargo e o número do candidato.",
      });
    }

    const candidato = await prisma.candidato.findFirst({
      where: {
        cargo: cargo.toUpperCase(),
        numero: Number(numero),
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        nomeUrna: true,
        numero: true,
        partido: true,
        cargo: true,
        uf: true,
      },
    });

    if (!candidato) {
      return res.status(404).json({
        mensagem: "Candidato não encontrado.",
      });
    }

    res.json(candidato);
  } catch (error) {
    console.error("Erro ao buscar candidato:", error);

    res.status(500).json({
      mensagem: "Erro ao buscar candidato.",
    });
  }
});

router.get("/apuracao", autenticarAdmin, async (req, res) => {

  try {
    const candidatos = await prisma.candidato.findMany({
      where: {
        ativo: true,
      },
      include: {
        lancamentos: true,
      },
      orderBy: [
        { cargo: "asc" },
        { numero: "asc" },
      ],
    });

    const resultado = candidatos.map((candidato) => ({
      id: candidato.id,
      nome: candidato.nome,
      nomeUrna: candidato.nomeUrna,
      numero: candidato.numero,
      partido: candidato.partido,
      cargo: candidato.cargo,
      uf: candidato.uf,
      votos: candidato.lancamentos.reduce(
        (total, lancamento) => total + lancamento.quantidade,
        0
      ),
    }));

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar apuração:", error);

    res.status(500).json({
      mensagem: "Erro ao buscar apuração.",
    });
  }
});

    router.post("/admin/login", async (req, res) => {
  try {
    const { senha } = req.body;

    if (!senha) {
      return res.status(400).json({
        mensagem: "Informe a senha.",
      });
    }

    if (senha !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        mensagem: "Senha administrativa incorreta.",
      });
    }

    const token = jwt.sign(
      { tipo: "admin" },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      mensagem: "Login administrativo realizado com sucesso.",
      token,
    });
  } catch (error) {
    console.error("Erro no login administrativo:", error);

    res.status(500).json({
      mensagem: "Erro ao realizar login administrativo.",
    });
  }
});


router.get("/participacoes", autenticarAdmin, async (req, res) => {
    
  try {
    const total = await prisma.participacao.count();

    res.json({
      totalParticipacoes: total,
    });
  } catch (error) {
    console.error("ERRO COMPLETO PARTICIPAÇÕES:", error);

    res.status(500).json({
      mensagem: "Erro ao buscar total de participações.",
    });
  }
});

module.exports = router;