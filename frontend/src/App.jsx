import { useState } from "react";
import axios from "axios";
import "./App.css";

const cargos = [
  { id: "presidente", nome: "Presidente", api: "PRESIDENTE" },
  { id: "governador", nome: "Governador", api: "GOVERNADOR" },
  { id: "senador1", nome: "Senador - 1ª vaga", api: "SENADOR" },
  { id: "senador2", nome: "Senador - 2ª vaga", api: "SENADOR" },
  {
    id: "deputadoFederal",
    nome: "Deputado Federal",
    api: "DEPUTADO FEDERAL",
  },
  {
    id: "deputadoEstadual",
    nome: "Deputado Estadual",
    api: "DEPUTADO ESTADUAL",
  },
];

function App() {
  const [votos, setVotos] = useState({
    presidente: "",
    governador: "",
    senador1: "",
    senador2: "",
    deputadoFederal: "",
    deputadoEstadual: "",
  });

  const [candidatos, setCandidatos] = useState({});
  const [confirmados, setConfirmados] = useState({});
  const [erros, setErros] = useState({});
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const confirmarVoto = async (cargo) => {
    const numero = votos[cargo.id];

    setMensagem("");

    if (!numero) {
      setErros((estado) => ({
        ...estado,
        [cargo.id]: "Informe o número do candidato.",
      }));
      return;
    }

    if (
      (cargo.id === "senador1" && numero === votos.senador2) ||
      (cargo.id === "senador2" && numero === votos.senador1)
    ) {
      setErros((estado) => ({
        ...estado,
        [cargo.id]: "Escolha um candidato diferente do outro senador.",
      }));
      return;
    }

    try {
      const resposta = await axios.get(
        `http://localhost:3001/api/candidatos/buscar?cargo=${encodeURIComponent(
          cargo.api
        )}&numero=${numero}`
      );

      const candidato = resposta.data;

      setCandidatos((estado) => ({
        ...estado,
        [cargo.id]: candidato,
      }));

      setConfirmados((estado) => ({
        ...estado,
        [cargo.id]: "confirmado",
      }));

      setErros((estado) => ({
        ...estado,
        [cargo.id]: "",
      }));
    } catch (error) {
      setCandidatos((estado) => ({
        ...estado,
        [cargo.id]: null,
      }));

      setConfirmados((estado) => ({
        ...estado,
        [cargo.id]: "",
      }));

      setErros((estado) => ({
        ...estado,
        [cargo.id]:
          error.response?.data?.mensagem ||
          "Candidato não encontrado.",
      }));
    }
  };

  const marcarBranco = (cargoId) => {
    setVotos((estado) => ({
      ...estado,
      [cargoId]: "",
    }));

    setCandidatos((estado) => ({
      ...estado,
      [cargoId]: null,
    }));

    setConfirmados((estado) => ({
      ...estado,
      [cargoId]: "branco",
    }));

    setErros((estado) => ({
      ...estado,
      [cargoId]: "",
    }));
  };

  const alterarNumero = (cargoId, valor) => {
    setVotos((estado) => ({
      ...estado,
      [cargoId]: valor,
    }));

    setCandidatos((estado) => ({
      ...estado,
      [cargoId]: null,
    }));

    setConfirmados((estado) => ({
      ...estado,
      [cargoId]: "",
    }));

    setErros((estado) => ({
      ...estado,
      [cargoId]: "",
    }));
  };

  const concluirVotacao = async (e) => {
    e.preventDefault();

    setMensagem("");

    const todosPreenchidos = cargos.every(
      (cargo) => confirmados[cargo.id]
    );

        if (!todosPreenchidos) {
      setMensagem(
        "Confirme uma opção em todos os cargos antes de concluir."
      );
      return;
    }

    if (!confirmando) {
      setConfirmando(true);
      return;
    }

    setConfirmando(false);

    try {
      setEnviando(true);

      const resposta = await axios.post(
        "http://localhost:3001/api/candidatos/pesquisa/concluir",
        {
          presidente:
            confirmados.presidente === "branco"
              ? null
              : votos.presidente,

          governador:
            confirmados.governador === "branco"
              ? null
              : votos.governador,

          senador1:
            confirmados.senador1 === "branco"
              ? null
              : votos.senador1,

          senador2:
            confirmados.senador2 === "branco"
              ? null
              : votos.senador2,

          deputadoFederal:
            confirmados.deputadoFederal === "branco"
              ? null
              : votos.deputadoFederal,

          deputadoEstadual:
            confirmados.deputadoEstadual === "branco"
              ? null
              : votos.deputadoEstadual,
        }
      );

      setMensagem("Pesquisa registrada com sucesso! Obrigado pela participação.");

setVotos({
  presidente: "",
  governador: "",
  senador1: "",
  senador2: "",
  deputadoFederal: "",
  deputadoEstadual: "",
});

setCandidatos({});
setConfirmados({});
setErros({});


    } catch (error) {
      setMensagem(
        error.response?.data?.mensagem ||
          "Não foi possível concluir a pesquisa."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="app">
      <div className="pesquisa">
        <h1><b>JMS - INTENÇÕES DE VOTOS</b></h1>

        <h2><b>ELEIÇÕES 2026</b></h2>

        <p className="subtitulo">
          Número do seu candidato
        </p>

        <form onSubmit={concluirVotacao}>
          {cargos.map((cargo) => (
            <div className="cargo" key={cargo.id}>
              <label>{cargo.nome}:</label>

              <div className="linha-voto">
                <input
                  type="number"
                  value={votos[cargo.id]}
                  onChange={(e) =>
                    alterarNumero(cargo.id, e.target.value)
                  }
                  disabled={confirmados[cargo.id] === "branco"}
                  placeholder="Número"
                />

                <button
                  type="button"
                  onClick={() => confirmarVoto(cargo)}
                  className={
                    confirmados[cargo.id] === "confirmado"
                      ? "confirmado"
                      : ""
                  }
                >
                  {confirmados[cargo.id] === "confirmado"
                    ? "✓ CONFIRMADO"
                    : "CONFIRMAR"}
                </button>

                <button
                  type="button"
                  onClick={() => marcarBranco(cargo.id)}
                  className={
                    confirmados[cargo.id] === "branco"
                      ? "branco selecionado"
                      : "branco"
                  }
                >
                  {confirmados[cargo.id] === "branco"
                    ? "✓ BRANCO"
                    : "BRANCO"}
                </button>
              </div>

              {candidatos[cargo.id] && (
                <div className="candidato">
                  <strong>
                    ✓ {candidatos[cargo.id].nomeUrna}
                  </strong>

                  <span>
                    Nº {candidatos[cargo.id].numero} •{" "}
                    {candidatos[cargo.id].partido}
                  </span>
                </div>
              )}

              {erros[cargo.id] && (
                <div className="erro">
                  {erros[cargo.id]}
                </div>
              )}
            </div>
          ))}

          <button
            type="submit"
            className="concluir"
            disabled={enviando}
          >
            {enviando
              ? "REGISTRANDO..."
              : "CONCLUIR VOTAÇÃO"}
          </button>
        </form>

                        {confirmando && (
                  <div className="confirmacao">
                    <p>
                      <strong>Confirma sua votação?</strong>
                    </p>

                    <p>
                      Depois de confirmar, não será possível alterar suas respostas.
                    </p>

                    <div className="botoes-confirmacao">
                      <button
                        type="button"
                        onClick={() => setConfirmando(false)}
                      >
                        CANCELAR
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          setConfirmando(false);
                          concluirVotacao(e);
                        }}
                      >
                        CONFIRMAR VOTAÇÃO
                      </button>
                    </div>
                  </div>
                )}

                {mensagem && (
          <div className="mensagem">
            {mensagem}
          </div>
        )}

        <div className="aviso-educacional">
          <strong>Pesquisa de caráter educacional — não oficial.</strong>
          <br />
          Esta pesquisa não possui vínculo com a Justiça Eleitoral e não representa uma votação oficial.
        </div>

      </div>
    </div>
  );
}

export default App;