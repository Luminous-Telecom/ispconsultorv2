import React from 'react';
import LegalPage from './LegalPage';

const Privacidade: React.FC = () => (
  <LegalPage title="Política de Privacidade">
    <p>
      <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
    </p>
    <p>
      A ISP Consultor está comprometida em proteger sua privacidade. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais.
    </p>

    <h2>1. Informações que coletamos</h2>
    <p>
      Coletamos informações que você nos fornece diretamente, como nome, e-mail e endereço, além de informações técnicas necessárias para o funcionamento do sistema.
    </p>

    <h2>2. Como usamos suas informações</h2>
    <p>
      Utilizamos suas informações para fornecer, manter e melhorar nossos serviços; processar transações; enviar comunicações relacionadas ao serviço; e cumprir obrigações legais.
    </p>

    <h2>3. Segurança</h2>
    <p>
      Implementamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração ou destruição.
    </p>

    <h2>4. Seus direitos</h2>
    <p>
      Você tem o direito de acessar e corrigir seus dados pessoais. Isso pode ser feito diretamente pelo painel do sistema, através do seu login.
    </p>

    <h2>5. Contato</h2>
    <p>
      Para dúvidas sobre esta política, entre em contato pelo WhatsApp ou Telegram indicados no site.
    </p>
  </LegalPage>
);

export default Privacidade;
