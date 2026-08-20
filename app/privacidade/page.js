export const metadata = { title: 'Política de Privacidade — Candle' };

export default function PrivacidadePage() {
  return (
    <div className="legal-page">
      <a className="legal-back" href="/">← Voltar</a>
      <h1>Política de Privacidade</h1>
      <p className="updated">Última atualização: 20 de agosto de 2026</p>

      <p>
        Esta política explica quais dados o Candle coleta, por que, e quais direitos você tem sobre eles, em
        conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>1. Quais dados coletamos</h2>
      <ul>
        <li>Nome, e-mail, faixa etária, curso/instituição — coletados na triagem, para personalizar seus treinos.</li>
        <li>Área de interesse, nível de experiência, objetivo e tempo disponível por dia — usados para montar sua composição de perguntas.</li>
        <li>Horário de lembrete escolhido — usado para enviar seu e-mail diário no horário certo.</li>
        <li>Histórico de respostas, acertos e sequência de dias treinados (streak) — usados para calcular seu progresso.</li>
        <li>Se você usar o recurso de amigos: seu ID público e, se optar por isso, sua visibilidade em buscas por nome.</li>
      </ul>

      <h2>2. Pagamento</h2>
      <p>
        Os dados de pagamento em si (Pix) são processados integralmente pela Asaas, nossa Instituição de Pagamento
        parceira. O Candle não armazena dados bancários nem de cartão — apenas o status da sua assinatura (ativa,
        pendente, cancelada) e as datas do seu ciclo de cobrança.
      </p>

      <h2>3. Recurso de amigos e ranking</h2>
      <p>
        A busca por outros usuários e o ranking de progresso são opt-in: seu progresso só fica visível para pessoas
        que você aceitou como amigos. Você pode desativar a busca por nome/ID a qualquer momento na tela de perfil —
        isso não afeta amizades já aceitas, só impede novos pedidos por busca (seu e-mail exato continua permitindo
        que alguém que já o conhece te encontre).
      </p>

      <h2>4. Seus direitos</h2>
      <p>Conforme a LGPD, você tem direito a:</p>
      <ul>
        <li>Acessar os dados que temos sobre você.</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
        <li>Solicitar a exclusão da sua conta e de todos os seus dados, a qualquer momento, pela tela de perfil.</li>
        <li>Retirar seu consentimento para o tratamento de dados.</li>
      </ul>

      <h2>5. Retenção</h2>
      <p>
        Ao excluir sua conta, seus dados pessoais são apagados permanentemente do nosso banco de dados. Registros
        mínimos e anonimizados de cobranças já realizadas podem ser mantidos separadamente, sem vínculo com seu nome
        ou e-mail, apenas quando exigido por obrigações fiscais e contábeis.
      </p>

      <h2>6. Contato</h2>
      <p>
        Para exercer qualquer um desses direitos ou tirar dúvidas sobre esta política, escreva para{' '}
        <a href="mailto:candlequizz@gmail.com">candlequizz@gmail.com</a>.
      </p>
    </div>
  );
}
