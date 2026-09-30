require("dotenv").config();

const https = require("https");
const AdmZip = require("adm-zip");

const prisma = require("./src/lib/prisma");

const URL_TSE =
  "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";

function baixarArquivo(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(
          new Error(`Erro ao baixar arquivo do TSE. Status: ${res.statusCode}`)
        );
        return;
      }

      const partes = [];

      res.on("data", (parte) => {
        partes.push(parte);
      });

      res.on("end", () => {
        resolve(Buffer.concat(partes));
      });
    }).on("error", reject);
  });
}

function separarCSV(linha) {
  const resultado = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const caractere = linha[i];

    if (caractere === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (caractere === ";" && !dentroAspas) {
      resultado.push(atual);
      atual = "";
    } else {
      atual += caractere;
    }
  }

  resultado.push(atual);

  return resultado;
}

function limpar(valor) {
  if (valor === undefined || valor === null) {
    return "";
  }

  return valor
    .replace(/^\uFEFF/, "")
    .replace(/^"|"$/g, "")
    .trim();
}

function converterCSV(conteudo) {
  const linhas = conteudo
    .replace(/\r/g, "")
    .split("\n")
    .filter((linha) => linha.trim() !== "");

  const cabecalho = separarCSV(linhas[0]).map(limpar);

  return linhas.slice(1).map((linha) => {
    const valores = separarCSV(linha);

    const objeto = {};

    cabecalho.forEach((campo, indice) => {
      objeto[campo] = limpar(valores[indice]);
    });

    return objeto;
  });
}

async function main() {
  console.log("==============================================");
  console.log(" JMS - IMPORTAÇÃO DE CANDIDATOS 2026");
  console.log(" Fonte: Tribunal Superior Eleitoral (TSE)");
  console.log("==============================================");

  console.log("\nBaixando base oficial do TSE...");

  const arquivo = await baixarArquivo(URL_TSE);

  console.log(
    `Arquivo baixado: ${(arquivo.length / 1024 / 1024).toFixed(2)} MB`
  );

  const zip = new AdmZip(arquivo);

  const entradas = zip.getEntries();

  const arquivoAM = entradas.find(
    (entrada) =>
      entrada.entryName.toLowerCase().endsWith("_am.csv") &&
      entrada.entryName.toLowerCase().includes("consulta_cand")
  );

  const arquivoBR = entradas.find(
    (entrada) =>
      entrada.entryName.toLowerCase().endsWith("_br.csv") &&
      entrada.entryName.toLowerCase().includes("consulta_cand")
  );

  if (!arquivoAM) {
    throw new Error("Arquivo de candidatos do Amazonas não encontrado.");
  }

  if (!arquivoBR) {
    throw new Error("Arquivo de candidatos à Presidência não encontrado.");
  }

  console.log(`Arquivo AM encontrado: ${arquivoAM.entryName}`);
  console.log(`Arquivo BR encontrado: ${arquivoBR.entryName}`);

  const candidatosAM = converterCSV(
    arquivoAM.getData().toString("latin1")
  );

  const candidatosBR = converterCSV(
    arquivoBR.getData().toString("latin1")
  );

  console.log(`\nRegistros AM encontrados: ${candidatosAM.length}`);
  console.log(`Registros BR encontrados: ${candidatosBR.length}`);

console.log("\nSITUAÇÕES ENCONTRADAS NO ARQUIVO AM:");
console.log("\nSITUAÇÕES ENCONTRADAS NO ARQUIVO AM:");

const situacoesAM = [
  ...new Set(
    candidatosAM.map((candidato) => {
      return `${candidato.CD_SITUACAO_CANDIDATURA} - ${candidato.DS_SITUACAO_CANDIDATURA}`;
    })
  ),
];

console.log(situacoesAM);

console.log(situacoesAM);

console.log("\nCargos encontrados no arquivo AM:");

const cargosAM = [
  ...new Set(
    candidatosAM.map(
      (candidato) => candidato.DS_CARGO
    )
  ),
];

console.log(cargosAM);

  const candidatos = [
  ...candidatosBR.filter(
    (candidato) =>
      candidato.DS_CARGO === "PRESIDENTE"
  ),

  ...candidatosAM.filter(
    (candidato) =>
      candidato.SG_UF === "AM" &&
      [
        "GOVERNADOR",
        "SENADOR",
        "DEPUTADO FEDERAL",
        "DEPUTADO ESTADUAL",
      ].includes(candidato.DS_CARGO)
  ),
];



  console.log(
    `\nCandidaturas aptas selecionadas: ${candidatos.length}`
  );

  const cargosPermitidos = [
    "PRESIDENTE",
    "GOVERNADOR",
    "SENADOR",
    "DEPUTADO FEDERAL",
    "DEPUTADO ESTADUAL",
  ];

  const candidatosFiltrados = candidatos.filter((candidato) =>
    cargosPermitidos.includes(candidato.DS_CARGO)
  );

  console.log(
    `Candidatos dos cargos utilizados pelo sistema: ${candidatosFiltrados.length}`
  );

  console.log("\nQUANTIDADE POR CARGO:");

for (const cargo of cargosPermitidos) {
  const quantidade = candidatosFiltrados.filter(
    (candidato) => candidato.DS_CARGO === cargo
  ).length;

  console.log(`${cargo}: ${quantidade}`);
}

  let inseridos = 0;
  let atualizados = 0;

  for (const candidato of candidatosFiltrados) {
    const numero = Number(candidato.NR_CANDIDATO);

    if (!numero) {
      continue;
    }

    const dados = {
      nome: candidato.NM_CANDIDATO,
      nomeUrna: candidato.NM_URNA_CANDIDATO,
      numero,
      partido: candidato.SG_PARTIDO || "",
      cargo: candidato.DS_CARGO,
      uf: candidato.SG_UF === "BR" ? "BR" : "AM",
      ativo: true,
    };

    const existente = await prisma.candidato.findFirst({
      where: {
        cargo: dados.cargo,
        numero: dados.numero,
      },
    });

    if (existente) {
      await prisma.candidato.update({
        where: {
          id: existente.id,
        },
        data: dados,
      });

      atualizados++;
    } else {
      await prisma.candidato.create({
        data: dados,
      });

      inseridos++;
    }
  }

  console.log("\n==============================================");
  console.log(" IMPORTAÇÃO CONCLUÍDA");
  console.log("==============================================");
  console.log(`Novos candidatos: ${inseridos}`);
  console.log(`Candidatos atualizados: ${atualizados}`);
  console.log(`Total processado: ${candidatosFiltrados.length}`);
  console.log("==============================================\n");
}

main()
  .catch((erro) => {
    console.error("\nERRO NA IMPORTAÇÃO:");
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });