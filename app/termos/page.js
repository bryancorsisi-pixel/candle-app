export const metadata = { title: 'Termos de Uso — Candle' };

export default function TermosPage() {
  return (
    <div className="legal-page">
      <a className="legal-back" href="/">← Voltar</a>
      <h1>Termos de Uso</h1>
      <p className="updated">Última atualização: 20 de agosto de 2026</p>

      <p>
        Estes Termos de Uso regulam o uso do Candle, um aplicativo de treino diário de conteúdo para o mercado
        financeiro, oferecido por assinatura mensal. Ao criar uma conta, você concorda com os termos abaixo.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O Candle oferece um diagnóstico gratuito inicial e, mediante assinatura paga, acesso a um banco de 1.600
        perguntas organizadas por área (Macroeconomia, Finanças Corporativas, Produtos Financeiros e Atualidades) e
        por nível (Conceito, Aplicação, Raciocínio e Caso/Entrevista), treino diário, lembrete por e-mail no horário
        escolhido por você, acompanhamento de progresso e sequência (streak), e um recurso opcional de amigos e
        ranking comparativo.
      </p>

      <h2>2. Preço, ciclo de cobrança e forma de pagamento</h2>
      <p>
        A assinatura custa R$ 11,90 por mês, cobrada mensalmente via Pix através da Asaas, uma Instituição de
        Pagamento autorizada pelo Banco Central do Brasil. O Candle não processa nem armazena dados de pagamento —
        isso é feito integralmente pela Asaas.
      </p>

      <h2>3. Cancelamento</h2>
      <p>
        Você pode cancelar sua assinatura a qualquer momento, na tela de perfil, sem multa. Ao cancelar, seu acesso
        continua liberado até o fim do período que você já pagou — você não perde acesso imediatamente, e não é
        cobrado de novo depois disso.
      </p>

      <h2>4. Direito de arrependimento (7 dias)</h2>
      <p>
        Conforme o Art. 49 do Código de Defesa do Consumidor, você tem até 7 dias corridos a partir da contratação
        para desistir da assinatura e pedir reembolso integral do valor pago, sem necessidade de justificativa. Esse
        direito se aplica apenas à primeira cobrança de cada ciclo de assinatura. Fora dessa janela, aplica-se apenas
        o cancelamento comum (item 3), sem reembolso do período já em curso.
      </p>

      <h2>5. Contratação por menores de idade</h2>
      <p>
        O Candle aceita cadastro de usuários menores de 18 anos para o diagnóstico gratuito. Como menores de 18 anos
        têm capacidade civil limitada para assumir compromissos financeiros, a contratação da assinatura paga exige
        confirmação, no momento do pagamento, de que quem está pagando é maior de idade ou tem autorização de um
        responsável legal.
      </p>

      <h2>6. Regras de uso aceitável</h2>
      <ul>
        <li>Sua conta é pessoal e intransferível — não compartilhe seu acesso com terceiros.</li>
        <li>É proibido tentar burlar, contornar ou explorar falhas no controle de acesso pago do serviço.</li>
        <li>É proibido usar o serviço para fins ilegais ou que violem direitos de terceiros.</li>
      </ul>

      <h2>7. Dados da empresa</h2>
      <p>
        [Preencher com a razão social, CNPJ ou CPF cadastrado na conta Asaas antes do lançamento.]
      </p>

      <h2>8. Contato e suporte</h2>
      <p>
        Dúvidas, problemas ou solicitações relacionadas a estes termos podem ser enviados para{' '}
        <a href="mailto:candlequizz@gmail.com">candlequizz@gmail.com</a>.
      </p>
    </div>
  );
}
