import { useState } from "react";
import axios from "axios";

function Admin() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [candidatos, setCandidatos] = useState([]);
  const [totalParticipacoes, setTotalParticipacoes] = useState(0);


const carregarApuracao = async () => {
  try {
    const token = localStorage.getItem("adminToken");

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const resposta = await axios.get(
      "http://localhost:3001/api/candidatos/apuracao",
      config
    );

    const respostaParticipacoes = await axios.get(
      "http://localhost:3001/api/candidatos/participacoes",
      config
    );

    setCandidatos(resposta.data);

    setTotalParticipacoes(
      respostaParticipacoes.data.totalParticipacoes
    );
  } catch (error) {
    setErro(
      error.response?.data?.mensagem ||
        "Não foi possível atualizar a apuração."
    );
  }
};
  
    const entrar = async (e) => {
    e.preventDefault();

    setErro("");
    setEntrando(true);

    try {
    
    const resposta = await axios.post(
  "http://localhost:3001/api/candidatos/admin/login",
  { senha }
);

localStorage.setItem("adminToken", resposta.data.token);

await carregarApuracao();
setAutenticado(true);

    } catch (error) {
      setErro(
        error.response?.data?.mensagem ||
          "Não foi possível realizar o login."
      );
    } finally {
      setEntrando(false);
    }
  };

  const cargos = [
    "PRESIDENTE",
    "GOVERNADOR",
    "SENADOR",
    "DEPUTADO FEDERAL",
    "DEPUTADO ESTADUAL",
  ];

  if (!autenticado) {
    return (
      <div className="admin">
        <div className="admin-login">
          <h1>JMS</h1>

          <h2>Área Administrativa</h2>

          <form onSubmit={entrar}>
            <label>Senha administrativa</label>

            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha"
            />

            <button type="submit" disabled={entrando}>
              {entrando ? "ENTRANDO..." : "ENTRAR"}
            </button>
          </form>

          {erro && <div className="admin-erro">{erro}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-painel">
        <h1>JMS - DESENVOLVIMENTO</h1>

        <h2>Apuração — Eleições 2026</h2>
        <div className="total-participacoes">
            Total de participações: <strong>{totalParticipacoes}</strong>
            </div>

        <button
  type="button"
  className="atualizar-apuracao"
  onClick={carregarApuracao}
>
  ATUALIZAR APURAÇÃO
</button>

        {cargos.map((cargo) => {
          const candidatosDoCargo = candidatos.filter(
            (candidato) =>
                candidato.cargo === cargo && candidato.votos > 0
            );

          return (
            <section className="apuracao-cargo" key={cargo}>
              <h3>{cargo}</h3>

              {candidatosDoCargo.length === 0 ? (
                <p>Nenhum candidato cadastrado.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Candidato</th>
                      <th>Partido</th>
                      <th>Votos</th>
                    </tr>
                  </thead>

                  <tbody>
                    {candidatosDoCargo.map((candidato) => (
                      <tr key={candidato.id}>
                        <td>{candidato.numero}</td>
                        <td>{candidato.nomeUrna}</td>
                        <td>{candidato.partido}</td>
                        <td>{candidato.votos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default Admin;