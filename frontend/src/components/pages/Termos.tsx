import React from 'react';
import LegalPage from './LegalPage';

const Termos: React.FC = () => (
  <LegalPage title="Termos de Uso">
    <p>
      <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
    </p>
    <p>
      Ao acessar e usar os serviços da ISP Consultor, você concorda com os seguintes termos de uso.
    </p>

    <h2>1. Aceitação dos termos</h2>
    <p>
      O uso da plataforma ISP Consultor implica aceitação integral destes termos. Se não concordar, não utilize nossos serviços.
    </p>

    <h2>2. Descrição do serviço</h2>
    <p>
      A ISP Consultor oferece sistema de gestão para consultores de telecomunicações, incluindo gestão de clientes, contratos, cobrança, NFS-e e funcionalidades correlatas.
    </p>

    <h2>3. Cadastro e responsabilidade</h2>
    <p>
      O usuário é responsável pela veracidade dos dados cadastrados e pela manutenção da confidencialidade de sua senha. Todas as atividades realizadas sob sua conta são de sua responsabilidade.
    </p>

    <h2>4. Uso adequado</h2>
    <p>
      É vedado o uso da plataforma para fins ilegais, ofensivos ou que prejudiquem terceiros. A ISP Consultor reserva-se o direito de suspender ou encerrar contas que violem estas condições.
    </p>

    <h2>5. Propriedade intelectual</h2>
    <p>
      O software, marcas e demais conteúdos da plataforma são de propriedade da ISP Consultor e estão protegidos por leis de propriedade intelectual.
    </p>

    <h2>6. Cancelamento</h2>
    <p>
      O usuário pode cancelar sua assinatura a qualquer momento, sem fidelidade. A ISP Consultor pode interromper o serviço em caso de inadimplência ou violação dos termos.
    </p>

    <h2>7. Contato</h2>
    <p>
      Para dúvidas sobre estes termos, entre em contato pelo WhatsApp ou Telegram indicados no site.
    </p>
  </LegalPage>
);

export default Termos;
