import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";
import logoText from "@/assets/logo-text.png";

interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: "bem-vindo",            label: "Bem-Vindo" },
  { id: "coleta-uso",           label: "Como Nós Coletamos e Usamos Informações" },
  { id: "dados-google",         label: "Dados do Google — Login Social" },
  { id: "compartilhamento",     label: "Compartilhamento das Suas Informações" },
  { id: "mudanca-controle",     label: "O que acontece caso haja alguma mudança no controle" },
  { id: "armazenamento",        label: "Como Nós Armazenamos e Protegemos Suas Informações" },
  { id: "suas-escolhas",        label: "Suas Escolhas em Relação às Suas Informações" },
  { id: "privacidade-menores",  label: "Privacidade de Crianças e Adolescentes" },
  { id: "links-externos",       label: "Links para Outros Sites e Serviços" },
  { id: "privacidade-ue",       label: "Direitos de Privacidade da União Europeia" },
  { id: "privacidade-california", label: "Direitos de Privacidade da Califórnia" },
  { id: "aplicacao",            label: "Aplicação" },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function PrivacyPolicy() {
  const [activeId, setActiveId] = useState<string>("bem-vindo");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="Genius ADS" className="w-7 h-7 object-contain" />
            <img src={logoText} alt="Genius ADS" className="h-6 object-contain" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 flex gap-10">

        {/* Sidebar — desktop */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 space-y-1">

            {/* Link Termos de Uso */}
            <a
              href="/terms-of-use"
              className="block text-sm text-muted-foreground hover:text-primary px-3 py-2 rounded-lg transition-colors"
            >
              Termos de Uso
            </a>
            <div className="border-t border-border my-2" />

            {/* Seções */}
            {sections.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`
                  w-full text-left text-[11px] px-3 py-1.5 rounded-lg transition-colors leading-snug
                  ${activeId === id
                    ? "text-primary font-medium border-l-2 border-primary pl-2.5 bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        {/* Mobile nav — select */}
        <div className="md:hidden w-full mb-6 absolute left-0 px-4" style={{ top: "4.5rem" }}>
          <select
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground"
            value={activeId}
            onChange={(e) => scrollTo(e.target.value)}
          >
            {sections.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        {/* Conteúdo principal */}
        <main className="flex-1 min-w-0 mt-10 md:mt-0">
          <h1 className="text-3xl font-display text-foreground mb-2">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mb-10">Última atualização: maio de 2026</p>

          <div className="space-y-14 prose-custom">

            {/* Bem-Vindo */}
            <section id="bem-vindo" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Bem-Vindo</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ao visitar ou utilizar nossos Serviços, você dá consentimento expresso à coleta, ao uso,
                ao armazenamento, ao processamento e à divulgação de suas informações, incluindo dados pessoais,
                conforme descrito nesta Política de Privacidade. Os termos em maiúsculas que não são definidos
                nesta Política de Privacidade estão definidos nos nossos Termos de Uso. Se você discordar de
                algo nesta Política ou nos Termos de Uso, não acesse ou utilize os Serviços.
              </p>
            </section>

            {/* Coleta e Uso */}
            <section id="coleta-uso" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Como Nós Coletamos e Usamos Informações</h2>
              <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <p className="font-semibold text-foreground mb-1">Informações analíticas</p>
                  <p>O Genius ADS pode coletar dados analíticos diretamente, ou usar ferramentas e serviços analíticos de terceiros, para mensurar as tendências de uso e tráfego do Serviço. Essas ferramentas coletam informações enviadas pelo seu navegador de internet ou dispositivo móvel, incluindo as páginas que você visita e outros dados que nos ajudem a aprimorar o Serviço. Coletamos e usamos tais informações de forma agregada, de modo que não possam ser facilmente usadas para identificar nenhum usuário individual.</p>
                  <p className="mt-3">Também podemos coletar informações fornecidas pelo usuário, incluindo feedbacks em pesquisas, comentários e sugestões (coletivamente, "Informações do Usuário"). Ao fornecer Informações do Usuário, você concede ao Genius ADS o direito de utilizá-las para fins comerciais, incluindo análises de dados, desenvolvimento de estratégias de marketing e geração de relatórios.</p>
                  <p className="mt-3">As Informações do Usuário coletadas poderão ser utilizadas para aprimorar nossos serviços, desenvolver novos produtos e funcionalidades, e melhorar a experiência do usuário. Você tem o direito de acessar, corrigir ou solicitar a exclusão das suas Informações do Usuário a qualquer momento.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Informações de cookies</p>
                  <p>Quando você acessa o Serviço, o Genius ADS pode enviar um ou mais cookies — pequenos arquivos de texto contendo caracteres alfanuméricos — ao seu computador para gerar um identificador exclusivo para seu navegador, ajudar você a fazer login mais rapidamente e aprimorar sua navegação.</p>
                  <p className="mt-3">Cookies persistentes ficam armazenados no disco rígido quando o usuário fecha o navegador e podem ser usados em visitas subsequentes. Cookies de sessão são temporários e desaparecem quando o navegador é fechado. Você pode configurar seu navegador para recusar todos os cookies, mas alguns recursos do Serviço podem não funcionar corretamente nesse caso.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Informações de arquivos de log</p>
                  <p>Seu navegador ou dispositivo móvel reporta informações de arquivos de log automaticamente cada vez que você acessa o Serviço. Esses arquivos podem incluir dados como endereço IP, tipo de navegador, URLs de referência, número de cliques e como você interage com os links do Serviço.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Informações de clear GIFs / web beacons</p>
                  <p>O Genius ADS pode utilizar clear GIFs (web beacons) para monitorar anonimamente os padrões de uso on-line dos nossos Usuários e em e-mails baseados em HTML, para monitorar quais e-mails os destinatários abrem e em quais links clicam.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Identificadores de dispositivo</p>
                  <p>Quando você acessa o Serviço por meio de um dispositivo móvel, podemos acessar, coletar, monitorar e/ou armazenar remotamente identificadores de dispositivo — pequenos arquivos vinculados ao seu dispositivo com a função de identificá-lo.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Dados de localização</p>
                  <p>Quando você acessa o Serviço por meio de um dispositivo móvel, podemos acessar e coletar dados de localização, incluindo coordenadas de GPS ou informações semelhantes ligadas à localização do seu dispositivo.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Comunicações comerciais e de marketing</p>
                  <p>Usamos as informações que coletamos, como seu endereço de e-mail, para nos comunicarmos diretamente com você. Podemos enviar e-mails contendo newsletters, promoções e ofertas especiais. Se não quiser recebê-los, você terá a opção de se descadastrar a qualquer momento enviando um e-mail para <a href="mailto:contato@adsgenius.com.br" className="text-primary underline">contato@adsgenius.com.br</a> ou seguindo as instruções de cancelamento presentes no corpo da comunicação recebida.</p>
                  <p className="mt-3">Também usamos suas informações para enviar e-mails relacionados ao Serviço — como verificação de conta, confirmações de cobrança, atualizações de funcionalidades e avisos técnicos e de segurança. Não é possível cancelar o recebimento desses tipos de e-mail.</p>
                </div>
              </div>
            </section>

            {/* Dados do Google */}
            <section id="dados-google" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-display text-foreground mb-4">Dados do Google — Login Social</h2>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  O Genius ADS oferece a opção de login com sua conta Google (Google OAuth). Ao utilizar
                  esta funcionalidade, acessamos exclusivamente os dados listados abaixo, conforme permitido
                  pelos escopos básicos de perfil do Google.
                </p>
                <div>
                  <p className="font-semibold text-foreground mb-2">Dados acessados via Google:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong className="text-foreground">Endereço de e-mail</strong> — utilizado para
                      criar e identificar sua conta no Genius ADS. Armazenado em nosso banco de dados
                      para autenticação e comunicações do serviço.
                    </li>
                    <li>
                      <strong className="text-foreground">Nome completo</strong> — utilizado para
                      personalizar a exibição do seu perfil dentro do aplicativo. Armazenado em nosso
                      banco de dados.
                    </li>
                    <li>
                      <strong className="text-foreground">Foto de perfil (avatar)</strong> — utilizada
                      como imagem de identificação visual no aplicativo. Armazenada como URL de referência.
                    </li>
                    <li>
                      <strong className="text-foreground">Identificador único do Google (ID)</strong> —
                      utilizado internamente pelo sistema de autenticação (Supabase Auth) para vincular
                      sua conta ao provedor Google de forma segura.
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">O que NÃO acessamos:</p>
                  <p>
                    O Genius ADS <strong className="text-foreground">não acessa</strong> dados do Gmail,
                    Google Drive, Google Contacts, Google Calendar, histórico de navegação, localização,
                    contatos ou qualquer outra informação além do perfil básico descrito acima.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">Uso dos dados do Google:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Os dados são usados exclusivamente para criar e manter sua conta no Genius ADS.</li>
                    <li>
                      Não compartilhamos dados do Google com terceiros, exceto o provedor de infraestrutura
                      (Supabase) que hospeda nosso banco de dados com segurança.
                    </li>
                    <li>Os dados do Google não são usados para fins publicitários ou de rastreamento.</li>
                    <li>
                      Você pode revogar o acesso a qualquer momento nas configurações de segurança da sua
                      conta Google em{" "}
                      <a
                        href="https://myaccount.google.com/permissions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        myaccount.google.com/permissions
                      </a>
                      .
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">Base legal:</p>
                  <p>
                    O acesso aos dados do Google ocorre mediante seu consentimento explícito no momento
                    do login social, em conformidade com a Política de Dados do Usuário dos Serviços de
                    API do Google e a LGPD (Lei Geral de Proteção de Dados — Lei nº 13.709/2018).
                  </p>
                </div>
              </div>
            </section>

            {/* Compartilhamento */}
            <section id="compartilhamento" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Compartilhamento das Suas Informações</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>O Genius ADS pode compartilhar suas Informações Pessoais com as finalidades e entidades descritas abaixo.</p>
                <p>Podemos compartilhar suas informações com parceiros comerciais terceiros para a finalidade de fornecer o Serviço a você. Trabalhamos com fornecedores de serviços — como empresas de hospedagem, provedoras de infraestrutura de banco de dados (Supabase), serviços de envio de e-mail transacional (Resend), processamento de pagamentos (Hotmart) e provedoras de inteligência artificial (OpenAI, FAL.AI) — que têm acesso limitado às suas informações somente para realizar tarefas em nosso nome.</p>
                <p>O Genius ADS divulgará suas informações quando for legalmente obrigado ou quando houver motivo para acreditar que tal ação é necessária para: (a) respeitar a lei e as solicitações de seus agentes aplicadores; (b) aplicar nossos Termos de Uso ou proteger a segurança e integridade do nosso Serviço; e/ou (c) exercitar ou proteger os direitos, a propriedade ou a segurança pessoal do Genius ADS, de nossos Usuários e de outros.</p>
              </div>
            </section>

            {/* Mudança de controle */}
            <section id="mudanca-controle" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">O que acontece caso haja alguma mudança no controle</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>O Genius ADS pode passar por processos de compra, venda, fusão, aquisição, transferência ou reorganização societária. Nossas informações, como nomes de clientes e endereços de e-mail, conteúdos gerados pelos usuários e outros dados vinculados ao Serviço, podem estar incluídas nos itens transferidos nesses tipos de transação.</p>
                <div>
                  <p className="font-semibold text-foreground mb-1">Situações em que somos obrigados a compartilhar suas informações</p>
                  <p>O Genius ADS divulgará suas informações quando for legalmente obrigado ou intimado, bem como se houver motivo para acreditar que tal ação é necessária para respeitar a lei, aplicar nossos Termos de Uso ou proteger os direitos, a propriedade ou a segurança do Genius ADS, dos nossos Usuários e de outros.</p>
                </div>
              </div>
            </section>

            {/* Armazenamento */}
            <section id="armazenamento" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Como Nós Armazenamos e Protegemos Suas Informações</h2>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <p className="font-semibold text-foreground mb-1">Armazenamento e Processamento</p>
                  <p>Suas informações coletadas por meio do Serviço podem ser armazenadas e processadas no Brasil ou em outros países onde o Genius ADS ou seus fornecedores de serviços mantenham infraestrutura. Ao utilizar o Serviço, você autoriza a transferência de informações conforme descrito nesta Política de Privacidade.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Mantendo suas informações seguras</p>
                  <p>O Genius ADS utiliza salvaguardas técnicas e organizacionais adequadas para preservar a integridade e segurança das informações coletadas, incluindo criptografia em trânsito (HTTPS/TLS), controle de acesso por autenticação e Row Level Security (RLS) no banco de dados, garantindo que cada usuário acesse apenas seus próprios dados.</p>
                  <p className="mt-3">Você é responsável por manter sua senha e informações de conta sob sigilo. O Genius ADS não pode garantir a segurança absoluta de nenhuma informação transmitida pela internet.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Comprometimento de informações</p>
                  <p>Caso alguma informação sob nosso controle seja comprometida após uma violação de segurança, o Genius ADS tomará as medidas necessárias para investigar a situação e, quando adequado, notificará os indivíduos cujas informações possam ter sido afetadas, em conformidade com a legislação aplicável, incluindo a Lei Geral de Proteção de Dados (LGPD).</p>
                </div>
              </div>
            </section>

            {/* Suas escolhas */}
            <section id="suas-escolhas" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Suas Escolhas em Relação às Suas Informações</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>Você pode fazer login na sua conta e alterar suas configurações e preferências de comunicação a qualquer momento. Você também pode optar por deixar de receber nossas comunicações promocionais por e-mail.</p>
                <p>O Genius ADS se compromete a processar todas as solicitações de descadastramento o quanto antes. Não é possível cancelar o recebimento de comunicações essenciais relacionadas ao Serviço, como verificação de conta, confirmações de cobrança e avisos de segurança.</p>
                <p>Em caso de dúvidas sobre como revisar ou modificar suas informações de conta, entre em contato diretamente pelo e-mail <a href="mailto:contato@adsgenius.com.br" className="text-primary underline">contato@adsgenius.com.br</a>.</p>
                <div>
                  <p className="font-semibold text-foreground mb-1">Por quanto tempo mantemos suas informações pessoais</p>
                  <p>Após o encerramento da sua conta de Usuário, o Genius ADS pode reter suas informações pessoais por um período comercialmente razoável para fins de backup, arquivamento ou auditoria, conforme exigido pela legislação brasileira.</p>
                </div>
              </div>
            </section>

            {/* Privacidade de menores */}
            <section id="privacidade-menores" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Privacidade de Crianças e Adolescentes</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>O Serviço e seu conteúdo não são destinados a pessoas menores de 18 anos de idade. O Genius ADS não coleta ou solicita intencionalmente informações de menores de 18 anos, nem permite intencionalmente que criem contas de usuário.</p>
                <p>Caso descubramos que coletamos informações pessoais de um menor de 18 anos sem verificação de consentimento dos responsáveis legais, apagaremos tais informações o quanto antes. Se você acreditar que podemos ter informações de ou sobre um menor de 18 anos, entre em contato conosco pelo e-mail <a href="mailto:contato@adsgenius.com.br" className="text-primary underline">contato@adsgenius.com.br</a>.</p>
              </div>
            </section>

            {/* Links externos */}
            <section id="links-externos" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Links para Outros Sites e Serviços</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O Genius ADS não se responsabiliza pelas práticas de privacidade de sites ou serviços de terceiros vinculados ao Serviço. Nossa Política de Privacidade não se aplica a sites ou serviços de terceiros que você visite a partir da nossa plataforma. Sua navegação nesses sites está sujeita às políticas internas de cada terceiro.
              </p>
            </section>

            {/* UE */}
            <section id="privacidade-ue" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Direitos de Privacidade da União Europeia</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>Para processar os dados pessoais de indivíduos na União Europeia, o Genius ADS se respalda nas seguintes bases jurídicas:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Nossos interesses legítimos em entregar os Serviços, aprimorar a plataforma, personalizar conteúdo e proteger a segurança dos nossos bancos de dados;</li>
                  <li>Seu consentimento expresso, quando relevante;</li>
                  <li>O cumprimento de obrigações contratuais para com você;</li>
                  <li>Conformidade com obrigações legais às quais estamos sujeitos.</li>
                </ol>
                <p>Usuários localizados na União Europeia têm os seguintes direitos: acesso às informações processadas, retificação de informações incorretas, revogação de consentimento, apagamento dos dados ("direito ao esquecimento"), restrição de processamento, portabilidade de dados, oposição ao processamento e reclamação formal à autoridade supervisora de proteção de dados do seu país de residência.</p>
              </div>
            </section>

            {/* Califórnia */}
            <section id="privacidade-california" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Direitos de Privacidade da Califórnia</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>Esta seção traz informações adicionais para residentes da Califórnia conforme a Lei de Privacidade do Consumidor da Califórnia (CCPA).</p>
                <p>O Genius ADS pode coletar as seguintes categorias de Informações Pessoais de residentes da Califórnia: identificadores (nome, endereço de e-mail, endereço IP), atividades de internet (histórico de navegação e interações com o Serviço) e informações de geolocalização (endereço IP).</p>
                <p>Residentes da Califórnia têm os seguintes direitos: divulgação das categorias de Informações Pessoais coletadas, acesso a detalhes específicos das informações coletadas, apagamento de Informações Pessoais, portabilidade dos dados e descadastramento da venda de Informações Pessoais. Para exercer qualquer desses direitos, entre em contato pelo e-mail <a href="mailto:contato@adsgenius.com.br" className="text-primary underline">contato@adsgenius.com.br</a>.</p>
              </div>
            </section>

            {/* Aplicação */}
            <section id="aplicacao" className="scroll-mt-24 pb-20">
              <h2 className="text-xl font-display text-foreground mb-4">Aplicação</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>Esta Política de Privacidade está relacionada aos seus dados e informações pessoais — dados sobre você, um indivíduo, que possam contribuir com sua identificação. Esta Política não se aplica a dados mantidos, processados ou publicados de forma anonimizada ou agregada que não possam ser vinculados a um indivíduo vivo.</p>
                <p>O Genius ADS se reserva o direito de gerar dados anonimizados e agregados extraídos de bancos de dados que contenham dados pessoais e utilizá-los conforme necessário para aprimorar o Serviço.</p>
                <p>Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Em caso de dúvidas, entre em contato pelo e-mail <a href="mailto:contato@adsgenius.com.br" className="text-primary underline">contato@adsgenius.com.br</a>.</p>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
