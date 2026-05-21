import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";
import logoText from "@/assets/logo-text.png";

interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: "objeto",                 label: "Do Objeto" },
  { id: "funcao",                 label: "Da Função da Plataforma" },
  { id: "aceite",                 label: "Do Aceite dos Termos" },
  { id: "glossario",              label: "Do Glossário" },
  { id: "acesso",                 label: "Do Acesso à Plataforma" },
  { id: "planos",                 label: "Informações sobre os Planos" },
  { id: "creditos",               label: "Do Sistema de Créditos" },
  { id: "agendamentos",           label: "Agendamentos e Integração com Redes Sociais" },
  { id: "cancelamento-reembolso", label: "Cancelamento e Reembolso" },
  { id: "licenca",                label: "Da Licença de Uso" },
  { id: "obrigacoes",             label: "Das Obrigações" },
  { id: "lgpd",                   label: "Da LGPD" },
  { id: "disposicoes-gerais",     label: "Disposições Gerais" },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function TermsOfUse() {
  const [activeId, setActiveId] = useState<string>("objeto");
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

            {/* Link Política de Privacidade */}
            <Link
              to="/privacy-policy"
              className="block text-sm text-muted-foreground hover:text-primary px-3 py-2 rounded-lg transition-colors"
            >
              Política de Privacidade
            </Link>
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

        {/* Mobile nav */}
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
          <h1 className="text-3xl font-display text-foreground mb-2">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground mb-2">Seja bem-vindo ao Genius ADS. Leia com atenção todos os termos abaixo.</p>
          <p className="text-sm text-muted-foreground mb-10">Última atualização: maio de 2026</p>

          <div className="space-y-14">

            {/* Do Objeto */}
            <section id="objeto" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Do Objeto</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>1.1. Este documento, e todo o conteúdo da plataforma, é oferecido pelo Genius ADS, neste termo representado apenas por "EMPRESA", que regulamenta todos os direitos e obrigações com todos que utilizam a plataforma, denominados neste termo como "USUÁRIOS", resguardando todos os direitos previstos na legislação, trazendo as cláusulas abaixo como requisito para acesso e uso da plataforma, situada no endereço www.adsgenius.com.br.</p>
                <p>1.2. A permanência na plataforma implica automaticamente na leitura e aceitação tácita dos Termos de Uso aqui tratados.</p>
              </div>
            </section>

            {/* Da Função da Plataforma */}
            <section id="funcao" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Da Função da Plataforma</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>2.1. O Genius ADS é uma plataforma de inteligência artificial desenvolvida para automatizar a criação de criativos visuais e copies persuasivas para anúncios e postagens em redes sociais, permitindo que qualquer pessoa ou empresa produza conteúdo profissional em segundos, sem necessidade de conhecimento em design ou redação publicitária.</p>
                <p>2.2. A EMPRESA busca, através de tecnologia de IA de alta qualidade, reduzir o tempo e os custos envolvidos na produção de criativos para tráfego pago e marketing orgânico, democratizando o acesso a ferramentas profissionais de criação de conteúdo.</p>
                <p>2.3. Nesta plataforma, é possível gerar criativos estáticos, carrosséis, copies com múltiplos ângulos, configurar a identidade visual da marca, agendar postagens e publicar conteúdo diretamente nas redes sociais integradas.</p>
                <p>2.4. Todo o conteúdo é gerado com base nos inputs fornecidos pelo próprio USUÁRIO. A EMPRESA não se responsabiliza por resultados comerciais decorrentes do uso dos criativos gerados, uma vez que o desempenho dos anúncios depende de variáveis externas fora do controle da plataforma.</p>
                <p>2.5. É de responsabilidade do USUÁRIO utilizar todas as funcionalidades da plataforma com senso crítico, revisando os conteúdos gerados antes de publicá-los ou utilizá-los em campanhas pagas.</p>
              </div>
            </section>

            {/* Do Aceite dos Termos */}
            <section id="aceite" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Do Aceite dos Termos</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>3.1. Este documento, chamado "Termos de Uso", será aplicado a todos os USUÁRIOS da plataforma do Genius ADS.</p>
                <p>3.2. Este termo exige que todo USUÁRIO ao acessar a plataforma leia e compreenda todas as cláusulas, visto que ele estabelece direitos e obrigações entre a EMPRESA e o USUÁRIO, aceitos expressamente ao permanecer utilizando a plataforma.</p>
                <p>3.3. Ao utilizar a plataforma, o USUÁRIO expressa que aceita e entende todas as cláusulas, concordando integralmente com cada uma delas, sendo este aceite imprescindível para a permanência na plataforma.</p>
                <p>3.4. Caso o USUÁRIO discorde de alguma cláusula ou termo deste contrato, deve imediatamente interromper sua navegação e uso da plataforma.</p>
                <p>3.5. Este termo pode e irá ser atualizado periodicamente pela EMPRESA, que se resguarda no direito de alteração, mediante comunicação prévia ao USUÁRIO pelos canais oficiais.</p>
                <p>3.6. Ao utilizar ou contratar a plataforma, o USUÁRIO autoriza a utilização de depoimentos e resultados obtidos para fins de publicidade da EMPRESA, respeitando a legislação vigente.</p>
              </div>
            </section>

            {/* Do Glossário */}
            <section id="glossario" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Do Glossário</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>4.1. Este termo pode conter palavras específicas que podem não ser de conhecimento geral.</p>
                <p>4.2. Entre elas:</p>
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <p><span className="font-semibold text-foreground">4.2.1. USUÁRIO:</span> Toda e qualquer pessoa que utilizar a plataforma, seja por meio do plano Free, PRO ou Advanced.</p>
                  <p><span className="font-semibold text-foreground">4.2.2. NAVEGAÇÃO:</span> O ato de visitar páginas e conteúdos da plataforma do Genius ADS.</p>
                  <p><span className="font-semibold text-foreground">4.2.3. COOKIES:</span> Pequenos arquivos de texto gerados automaticamente pela plataforma e transmitidos ao navegador do visitante, que servem para melhorar a usabilidade.</p>
                  <p><span className="font-semibold text-foreground">4.2.4. LOGIN:</span> Dados de acesso do USUÁRIO ao realizar o cadastro junto à EMPRESA, compostos por e-mail e senha, que dão acesso às funcionalidades da plataforma.</p>
                  <p><span className="font-semibold text-foreground">4.2.5. CRÉDITOS:</span> Unidade virtual que representa o custo computacional das funcionalidades de inteligência artificial da plataforma. São consumidos a cada ação de geração de criativo ou slide de carrossel e podem estar incluídos no plano de assinatura ou adquiridos em pacotes avulsos.</p>
                  <p><span className="font-semibold text-foreground">4.2.6. CRIATIVO:</span> Peça visual completa gerada pela IA, composta por imagem e copy, pronta para uso em anúncios pagos ou postagens orgânicas.</p>
                  <p><span className="font-semibold text-foreground">4.2.7. SLIDE:</span> Unidade individual de conteúdo dentro de um carrossel. A cobrança de Créditos para geração de carrossel é calculada por slide gerado.</p>
                  <p><span className="font-semibold text-foreground">4.2.8. CARROSSEL:</span> Formato de publicação composto por múltiplos slides sequenciais, utilizado em redes sociais como Instagram e Facebook.</p>
                  <p><span className="font-semibold text-foreground">4.2.9. PLANO DE ASSINATURA:</span> Modalidade de contratação periódica (mensal ou anual) que garante ao USUÁRIO acesso às funcionalidades da plataforma e um limite mensal de Créditos, conforme o plano escolhido (PRO ou Advanced).</p>
                  <p><span className="font-semibold text-foreground">4.2.10. MARCA:</span> Conjunto de informações de identidade visual e posicionamento configuradas pelo USUÁRIO na plataforma, incluindo logomarca, paleta de cores, tom de voz e dados do público-alvo, utilizadas como contexto em todas as gerações.</p>
                  <p><span className="font-semibold text-foreground">4.2.11. OFFLINE:</span> Quando a plataforma se encontra indisponível, não podendo ser acessada por nenhum USUÁRIO.</p>
                </div>
                <p>4.3. Em caso de dúvidas sobre qualquer termo utilizado, o USUÁRIO deverá entrar em contato com a EMPRESA através dos canais de comunicação disponíveis na plataforma.</p>
              </div>
            </section>

            {/* Do Acesso à Plataforma */}
            <section id="acesso" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Do Acesso à Plataforma</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>5.1. A plataforma funciona normalmente 24 (vinte e quatro) horas por dia, podendo ocorrer pequenas interrupções temporárias para ajustes, manutenção ou atualização. Quando planejadas, tais interrupções ocorrerão preferencialmente em horários de menor uso para maior conveniência dos USUÁRIOS.</p>
                <p>5.2. A EMPRESA não se responsabiliza por nenhuma perda de oportunidade ou prejuízo que uma indisponibilidade temporária possa gerar aos USUÁRIOS.</p>
                <p>5.3. Em caso de manutenção que demande um período longo, a EMPRESA informará previamente por meio dos canais de comunicação disponíveis na plataforma.</p>
                <p>5.4. O acesso à plataforma é permitido apenas para maiores de 18 anos ou que tenham autorização expressa de seus pais ou responsáveis legais, sendo este acesso de inteira responsabilidade do USUÁRIO.</p>
                <p>5.5. Todos os dados estão protegidos conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), e ao realizar o cadastro, o USUÁRIO concorda integralmente com a coleta de dados conforme a lei e com a Política de Privacidade da EMPRESA.</p>
              </div>
            </section>

            {/* Informações sobre os Planos */}
            <section id="planos" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Informações sobre os Planos</h2>
              <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <p className="font-semibold text-foreground mb-2">Plano Free</p>
                  <div className="space-y-2">
                    <p>6.1.1. O Genius ADS oferece um plano gratuito (Free) para novos USUÁRIOS, permitindo o acesso às funcionalidades da plataforma com um limite de 60 (sessenta) Créditos, equivalentes a até 6 (seis) gerações de criativos completos ou 1 (um) carrossel de até 6 slides.</p>
                    <p>6.1.2. O plano Free inclui acesso a até 2 (duas) marcas configuradas na plataforma, geração de criativos estáticos e carrosséis, dentro do limite de Créditos disponíveis.</p>
                    <p>6.1.3. Não há obrigação de contratar um plano pago após o uso dos créditos do plano Free. O USUÁRIO pode optar pela contratação de um plano pago para continuar utilizando a plataforma com volume maior de Créditos mensais.</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">Plano PRO</p>
                  <div className="space-y-2">
                    <p>6.2.1. O Plano PRO oferece 500 (quinhentos) Créditos mensais, equivalentes a até 50 (cinquenta) criativos completos por mês.</p>
                    <p>6.2.2. Plano mensal: cobrado e renovado automaticamente a cada mês pelo valor de R$ 59,90.</p>
                    <p>6.2.3. Plano anual: cobrado pelo valor de R$ 539,10, equivalente a R$ 44,92 por mês, com renovação automática anual.</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">Plano Advanced</p>
                  <div className="space-y-2">
                    <p>6.3.1. O Plano Advanced oferece 1.000 (mil) Créditos mensais, equivalentes a até 100 (cem) criativos completos por mês.</p>
                    <p>6.3.2. Plano mensal: cobrado e renovado automaticamente a cada mês pelo valor de R$ 89,90.</p>
                    <p>6.3.3. Plano anual: cobrado pelo valor de R$ 719,20, equivalente a R$ 59,93 por mês, com renovação automática anual.</p>
                  </div>
                </div>
                <p>6.4. Ao se inscrever em um dos planos de assinatura, o USUÁRIO autoriza a cobrança automática do valor correspondente na data de renovação da assinatura, conforme o método de pagamento escolhido.</p>
                <p>6.5. Ao optar pelo plano anual, o USUÁRIO declara estar ciente de que o valor total é cobrado de forma integral, podendo ser parcelado conforme as condições disponíveis no momento da contratação, e que não haverá reembolso de valores remanescentes em caso de cancelamento antes do término do período contratado, salvo dentro do prazo de arrependimento previsto em lei.</p>
                <p>6.6. Os pagamentos são processados via Hotmart. A EMPRESA não armazena dados de cartão de crédito do USUÁRIO — todas as informações de pagamento são gerenciadas exclusivamente pela plataforma de pagamento contratada.</p>
                <p>6.7. A EMPRESA reserva-se o direito de reajustar os preços dos planos de assinatura a qualquer momento, mediante comunicação ao USUÁRIO com antecedência mínima de 30 (trinta) dias antes da data de vigência, por e-mail ao endereço cadastrado e/ou aviso na plataforma. O reajuste não afetará o ciclo de faturamento em curso.</p>
              </div>
            </section>

            {/* Do Sistema de Créditos */}
            <section id="creditos" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Do Sistema de Créditos</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>7.1. A plataforma do Genius ADS opera por meio de um sistema de Créditos virtuais, que representam a unidade de medida do esforço computacional consumido pela inteligência artificial ao processar as solicitações do USUÁRIO.</p>
                <p>7.2. Cada criativo estático gerado ou cada slide de carrossel gerado consome 10 (dez) Créditos. O custo estimado é exibido na plataforma antes da confirmação da geração.</p>
                <p>7.3. Os Créditos são descontados no momento da geração do conteúdo, e não no momento do agendamento ou publicação. O ato de agendar ou publicar postagens não consome Créditos.</p>
                <p>7.4. Os Créditos incluídos nos planos de assinatura têm validade mensal e são renovados a cada ciclo de faturamento, independentemente do saldo remanescente. Créditos não utilizados até a data de renovação são perdidos e não são acumulados para o período seguinte.</p>
                <p>7.5. O USUÁRIO poderá adquirir pacotes de Créditos Avulsos, separados da assinatura, para uso em períodos de maior demanda. Estes Créditos Avulsos não expiram na renovação mensal e permanecem disponíveis na conta até serem consumidos integralmente.</p>
                <p>7.6. A EMPRESA reserva-se o direito de alterar, a qualquer momento, a tabela de custos por ação (Créditos por criativo, por slide ou por funcionalidade), bem como os limites de Créditos incluídos em cada plano. Tais alterações podem decorrer de variações nos custos de APIs de terceiros utilizadas pela plataforma, reajustes de mercado ou mudanças tecnológicas.</p>
                <p>7.7. O USUÁRIO será notificado sobre alterações relevantes na tabela de Créditos com antecedência mínima de 15 (quinze) dias, por e-mail cadastrado e/ou aviso na plataforma. A continuidade de uso após a data de vigência implica na aceitação integral das novas condições.</p>
              </div>
            </section>

            {/* Agendamentos */}
            <section id="agendamentos" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Agendamentos e Integração com Redes Sociais</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>8.1. A funcionalidade de agendamento de postagens e publicação direta do Genius ADS depende de integrações com APIs de terceiros, incluindo, mas não se limitando a, Meta (Instagram e Facebook) e demais redes sociais suportadas. Tais integrações estão sujeitas a alterações, instabilidades e restrições impostas unilateralmente por esses terceiros, fora do controle da EMPRESA.</p>
                <p>8.2. A EMPRESA não garante a execução ininterrupta dos agendamentos realizados pelo USUÁRIO. Eventos como instabilidades de API, revogação de tokens de autenticação, mudanças nas políticas das redes sociais e falhas técnicas podem resultar na perda parcial ou total de agendamentos programados.</p>
                <p>8.3. A EMPRESA não se responsabiliza por qualquer prejuízo decorrente da perda de agendamentos, incluindo perda de alcance, custos operacionais ou danos à imagem do USUÁRIO em razão da não execução de postagens programadas.</p>
                <p>8.4. É de responsabilidade do USUÁRIO manter registros próprios de seus agendamentos e conteúdos. A EMPRESA não pode ser responsabilizada pela ausência de backup externo por parte do USUÁRIO.</p>
                <p>8.5. A utilização contínua das funcionalidades de agendamento e publicação implica na ciência e aceitação integral pelo USUÁRIO das limitações descritas nesta seção.</p>
              </div>
            </section>

            {/* Cancelamento e Reembolso */}
            <section id="cancelamento-reembolso" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Cancelamento e Reembolso</h2>
              <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <p className="font-semibold text-foreground mb-2">Da diferença entre cancelamento e reembolso</p>
                  <div className="space-y-2">
                    <p>9.1. Cancelar um plano implica apenas na suspensão de renovações futuras, sem devolução de valores já pagos.</p>
                    <p>9.2. Para reembolsos, é necessário realizar uma solicitação específica dentro dos critérios estabelecidos abaixo.</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">Do cancelamento</p>
                  <div className="space-y-2">
                    <p>9.3. O cancelamento da assinatura interrompe a renovação automática futura. O USUÁRIO continuará com pleno acesso aos serviços contratados até o término do período já pago.</p>
                    <p>9.4. Para evitar a cobrança automática na data de renovação, o cancelamento deve ser realizado antes dessa data por meio das configurações da conta na plataforma ou pelo contato <a href="mailto:contato@adsgenius.com.br" className="text-primary underline">contato@adsgenius.com.br</a>.</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">Do reembolso</p>
                  <div className="space-y-2">
                    <p>9.5. Os reembolsos poderão ser solicitados em até 7 (sete) dias corridos após a realização da compra inicial, conforme o artigo 49 do Código de Defesa do Consumidor — direito de arrependimento.</p>
                    <p>9.6. A EMPRESA não se responsabiliza por reembolsos solicitados após o prazo estabelecido.</p>
                    <p>9.7. Havendo solicitação de reembolso dentro do prazo, a EMPRESA se compromete a processar o adimplemento em até 30 (trinta) dias após a solicitação formalizada.</p>
                    <p>9.8. O reembolso poderá ser condicionado à análise do uso da plataforma pelo USUÁRIO. Entende-se como utilização significativa o consumo de mais de 100 (cem) Créditos dentro do período de 7 (sete) dias, hipótese em que a EMPRESA pode negar o reembolso, considerando o benefício já recebido.</p>
                    <p>9.9. Na contratação do plano anual, será possível solicitar reembolso observando as mesmas diretrizes, desde que a solicitação seja realizada em até 7 (sete) dias corridos após a data da compra.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Da Licença de Uso */}
            <section id="licenca" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Da Licença de Uso</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>10.1. O USUÁRIO poderá acessar todo o conteúdo da plataforma, não significando nenhuma cessão de direito ou permissão de cópia, reprodução ou redistribuição dos elementos que compõem a plataforma em si.</p>
                <p>10.2. Os criativos gerados pelo USUÁRIO por meio da plataforma são de uso livre pelo próprio USUÁRIO, que poderá utilizá-los em campanhas pagas, postagens orgânicas e demais finalidades comerciais, sem necessidade de autorização adicional da EMPRESA.</p>
                <p>10.3. Todos os direitos sobre a plataforma, sua interface, algoritmos, modelos e demais elementos são preservados conforme a legislação brasileira, principalmente a Lei de Direitos Autorais (Lei nº 9.610/98) e o Código Civil brasileiro.</p>
                <p>10.4. É vedada a reprodução, cópia, venda ou redistribuição de qualquer elemento da plataforma sem autorização expressa e por escrito da EMPRESA.</p>
              </div>
            </section>

            {/* Das Obrigações */}
            <section id="obrigacoes" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Das Obrigações</h2>
              <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <p className="mb-2">11.1. O USUÁRIO ao utilizar a plataforma se obriga a:</p>
                  <div className="space-y-2 pl-4 border-l-2 border-border">
                    <p>11.1.1. Não realizar ações que visem invadir, hackear, destruir ou prejudicar a infraestrutura da plataforma ou de seus parceiros comerciais, incluindo envio de vírus, ataques de DDOS, exploração de vulnerabilidades ou quaisquer outras práticas que comprometam a segurança e funcionalidade.</p>
                    <p>11.1.2. Utilizar a plataforma exclusivamente para fins lícitos e em conformidade com estes Termos, abstendo-se de práticas que possam violar leis, regulamentos ou direitos de terceiros.</p>
                    <p>11.1.3. Não utilizar a plataforma para gerar conteúdo discriminatório, ofensivo, que promova discurso de ódio, desinformação ou que infrinja direitos autorais ou de imagem de terceiros.</p>
                    <p>11.1.4. Manter seus dados de login e senha em sigilo, sendo integralmente responsável por qualquer uso indevido de sua conta decorrente de negligência ou compartilhamento indevido dessas informações.</p>
                    <p>11.1.5. Notificar imediatamente a EMPRESA sobre qualquer uso não autorizado de sua conta ou qualquer falha de segurança de que tenha conhecimento.</p>
                    <p>11.1.6. Estar ciente de que, em caso de descumprimento de qualquer obrigação estabelecida neste Termo, poderá ser banido da plataforma sem prejuízo de eventuais medidas judiciais ou extrajudiciais adotadas pela EMPRESA.</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2">11.2. A EMPRESA se obriga a:</p>
                  <div className="space-y-2 pl-4 border-l-2 border-border">
                    <p>11.2.1. Empenhar esforços razoáveis para manter a plataforma operacional, salvo interrupções necessárias para manutenção, atualizações ou eventos fora do controle da EMPRESA.</p>
                    <p>11.2.2. Disponibilizar canais de atendimento para esclarecer dúvidas relacionadas ao uso da plataforma.</p>
                    <p>11.2.3. Proteger os dados fornecidos pelo USUÁRIO de acordo com a Política de Privacidade e com a LGPD.</p>
                    <p>11.2.4. Não compartilhar dados pessoais do USUÁRIO com terceiros, exceto quando exigido por lei, necessário para a prestação do serviço ou mediante autorização expressa do USUÁRIO.</p>
                    <p>11.2.5. Comunicar ao USUÁRIO com antecedência mínima razoável sobre alterações significativas nos planos, preços ou funcionalidades da plataforma.</p>
                  </div>
                </div>
                <p>11.3. A EMPRESA não possui responsabilidade por conteúdos gerados pelo USUÁRIO com cunho discriminatório, uma vez que a geração de conteúdo obedece exclusivamente aos comandos e inputs fornecidos pelo próprio USUÁRIO.</p>
              </div>
            </section>

            {/* Da LGPD */}
            <section id="lgpd" className="scroll-mt-24">
              <h2 className="text-xl font-display text-foreground mb-4">Da LGPD</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>12.1. As partes concordam em cumprir integralmente a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD), comprometendo-se a adotar todas as medidas necessárias para garantir a proteção dos dados pessoais tratados no âmbito deste Termo.</p>
                <p>12.2. A EMPRESA se compromete a tratar os dados pessoais do USUÁRIO exclusivamente para os fins relacionados à prestação do serviço, respeitando os princípios de finalidade, necessidade e adequação.</p>
                <p>12.3. A EMPRESA se obriga a implementar medidas técnicas e administrativas aptas a proteger os dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração ou comunicação inadequada.</p>
                <p>12.4. Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos dados pessoais tratados, a EMPRESA comunicará o USUÁRIO com a descrição da natureza dos dados afetados, as medidas de segurança utilizadas, os riscos relacionados ao incidente e as medidas adotadas para mitigar os efeitos do prejuízo.</p>
                <p>12.5. Qualquer parte que receba dados pessoais obriga-se a notificar a outra parte, em até 24 (vinte e quatro) horas, acerca de qualquer vazamento ou comprometimento de bases de dados.</p>
                <div>
                  <p className="font-semibold text-foreground mb-2">Dos Direitos do Titular de Dados</p>
                  <p className="mb-2">12.6. O USUÁRIO, na qualidade de titular dos dados pessoais, tem assegurados os seguintes direitos, conforme o art. 18 da LGPD:</p>
                  <div className="space-y-1.5 pl-4 border-l-2 border-border">
                    <p>a) Confirmação da existência de tratamento de seus dados pessoais;</p>
                    <p>b) Acesso aos dados pessoais tratados;</p>
                    <p>c) Correção de dados incompletos, inexatos ou desatualizados;</p>
                    <p>d) Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a LGPD;</p>
                    <p>e) Portabilidade dos dados a outro fornecedor de serviço, mediante requisição expressa;</p>
                    <p>f) Eliminação dos dados pessoais tratados com consentimento, ressalvadas as hipóteses legais de conservação;</p>
                    <p>g) Informação sobre as entidades com as quais a EMPRESA compartilhou dados;</p>
                    <p>h) Revogação do consentimento, nos termos da LGPD.</p>
                  </div>
                </div>
                <p>12.7. O exercício dos direitos previstos na cláusula 12.6 poderá ser realizado pelo USUÁRIO pelo e-mail <a href="mailto:contato@adsgenius.com.br" className="text-primary underline">contato@adsgenius.com.br</a>.</p>
              </div>
            </section>

            {/* Disposições Gerais */}
            <section id="disposicoes-gerais" className="scroll-mt-24 pb-20">
              <h2 className="text-xl font-display text-foreground mb-4">Disposições Gerais</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>13.1. A plataforma poderá apresentar hiperlinks que levam a sites externos. A EMPRESA não tem responsabilidade pelo conteúdo desses sites externos, sendo o USUÁRIO integralmente responsável pelo acesso e por quaisquer ações que venha a realizar nesses sites.</p>
                <p>13.2. Em caso de conflitos judiciais entre o USUÁRIO e a EMPRESA, o foro eleito para a devida ação será o da comarca da sede da EMPRESA, mesmo que haja outro mais privilegiado.</p>
                <p>13.3. Quaisquer alterações neste Termo serão publicadas na plataforma e, se significativas, o USUÁRIO será notificado por meio dos canais de contato fornecidos no cadastro.</p>
                <p>13.4. Este Termo de Uso é válido a partir da data de publicação na plataforma e substitui integralmente versões anteriores.</p>
                <p>13.5. Para dúvidas, sugestões ou solicitações relacionadas a estes Termos, o USUÁRIO pode entrar em contato pelo e-mail <a href="mailto:contato@adsgenius.com.br" className="text-primary underline">contato@adsgenius.com.br</a>.</p>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
