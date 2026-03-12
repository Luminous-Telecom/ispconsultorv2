import React from 'react';
import LegalPage from './LegalPage';

const Cookies: React.FC = () => (
  <LegalPage title="Política de Cookies">
    <p>
      <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
    </p>
    <p>
      Esta política explica como o BackNet usa cookies e armazenamento no navegador.
    </p>

    <h2>1. O que utilizamos</h2>
    <p>
      O BackNet usa duas tecnologias no seu navegador:
    </p>
    <ul>
      <li><strong>Cookie de sessão:</strong> Definido pelo servidor para manter você logado. É um cookie seguro (HttpOnly) que o navegador envia automaticamente em cada requisição.</li>
      <li><strong>Armazenamento local (localStorage):</strong> Guarda preferências que você escolhe, como o idioma e o tema (claro ou escuro). Essas informações ficam no seu dispositivo.</li>
    </ul>

    <h2>2. Para que serve cada um</h2>
    <p>
      O cookie de sessão é essencial para o funcionamento do painel: sem ele, você precisaria fazer login em toda troca de página. O armazenamento local lembra suas preferências entre visitas, evitando que você tenha que selecionar idioma e tema novamente.
    </p>

    <h2>3. Como gerenciar</h2>
    <p>
      Para limpar o armazenamento local (tema, idioma), use as ferramentas do seu navegador ou apague os dados do site. O cookie de sessão expira ao fazer logout ou quando o navegador é fechado, dependendo da configuração.
    </p>

    <h2>4. Contato</h2>
    <p>
      Para dúvidas sobre cookies e armazenamento, entre em contato pelo WhatsApp ou Telegram indicados no site.
    </p>
  </LegalPage>
);

export default Cookies;
