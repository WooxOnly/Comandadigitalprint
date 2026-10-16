# Licenças mensais por cliente

A licença pertence ao cadastro de **Cliente**, seja uma loja única ou um cliente com várias lojas. Não existe uma licença administrativa global, por usuário ou por tablet. As lojas vinculadas ao mesmo cliente compartilham validade e situação. Lojas legadas ainda sem cliente mantêm uma licença própria com chave `store:<id>` até a organização do cadastro.

## Administrativo

Abrir **Clientes → cliente → Licença do cliente**. A situação e a validade ficam visíveis; os controles de gestão e de liberação offline são recolhidos inicialmente para manter a página compacta.

- Validade inicial: um mês de calendário a partir da primeira consulta, com renovação automática habilitada.
- Renovação automática: ao consultar uma licença ativa vencida, o servidor avança os períodos mensais até a próxima validade. Conserva o dia de aniversário: 31/janeiro → último dia de fevereiro → 31/março. Não é cobrança nem comprovação de pagamento.
- É possível desligar a renovação, editar a validade e renovar manualmente por um mês. Para deixar uma licença vencer, desmarcar a renovação automática.
- Bloquear impede renovação e utilização online das APIs operacionais do tablet. Desbloquear retoma o estado ativo; se a renovação estiver desativada e a validade já passou, também é necessário renovar ou ajustar a data.
- Somente a sessão do painel administrativo permite alterações e geração de códigos. Sessões do APK e do Portal do cliente não concedem essa permissão. Há validação de origem e revisão contra gravações concorrentes.
- Alterações administrativas e geração de códigos têm histórico técnico separado por cliente. Códigos, assinaturas e chaves privadas não são gravados no histórico.

## Tablet e ausência de internet

O app guarda localmente uma licença assinada e a identificação do aparelho em SecureStore, fora da sincronização e da restauração de backups de pedidos. Faz uma tentativa automática por dia UTC ao abrir, voltar ao primeiro plano ou permanecer aberto. Falha de conexão não bloqueia uma licença válida. No vencimento, tenta consultar novamente mesmo se já consultou antes naquele dia; há também **Verificar agora**.

- **Nunca verificado:** exige a primeira consulta ou um código temporário válido. Não inventa validade ilimitada nem um período gratuito local.
- **Sem conexão:** funciona até a validade já recebida; não consegue receber renovações ou novos bloqueios do servidor.
- **Vencido:** mostra a tela da licença. O pedido em edição permanece montado e os dados não são apagados. A interface verifica a validade a cada minuto e ao retornar ao primeiro plano.
- **Bloqueado:** ao receber esse estado, impede o uso mesmo se a validade anterior ainda estiver no futuro. O servidor também recusa operações autenticadas de qualquer perfil, inclusive Admin.
- **Relógio:** a última referência de horário é persistida. Retrocesso relevante do relógio exige corrigir data/hora; avançar o relógio e voltar não recupera uma licença já vencida. Não há garantia contra adulteração de um aparelho com root ou APK modificado.

Bloqueio remoto não é instantâneo em um aparelho sem conexão ou que ainda não fez sua consulta diária. APKs antigos precisam ser atualizados para aplicar a barreira local; as APIs operacionais do servidor já validam a licença.

## Código temporário

No tablet, copiar **Identificador do tablet**. No administrativo, dentro do cliente, selecionar loja, identificador e data/hora final, até **31 dias**. Copiar o código completo e colar no tablet em **Aplicar código temporário**. O mesmo fluxo existe na vinculação inicial para um aparelho que nunca conseguiu verificar a licença.

O código é uma autorização assinada ECDSA P-256/SHA-256 e contém ambiente/origem, cliente, loja, aparelho, revisão e vencimento absoluto. Alteração, outro ambiente, outro aparelho, prazo vencido ou revisão antiga conhecida são recusados. Reutilizar o mesmo código não estende seu prazo. Não cria usuário, muda senha ou dispensa a autenticação normal do operador. Na primeira instalação completamente offline, ainda é necessário ter o acesso de operador recuperável pelo fluxo já existente.

Uma consulta online bem-sucedida substitui a autorização temporária pelo estado atual do servidor. Depois de receber um bloqueio mais recente, o tablet não aceita novamente o código antigo. O código é limpo da tela administrativa após cinco minutos ou quando a página fica oculta; a autorização emitida conserva sua validade absoluta.

## Publicação em homologação

Desenvolvimento e testes locais não ativam a função online. Antes do novo Worker/APK:

1. Fazer e conferir o backup do D1 de homologação.
2. Aplicar somente `server/cloudflare/license-schema.sql` ao D1 de homologação. É uma migração aditiva e reaplicável, sem substituir dados das lojas.
3. Configurar `LICENSE_SIGNING_PRIVATE_JWK` como segredo do Worker de homologação. A chave privada deve corresponder à chave pública versionada em `src/config/license-public-key.json`. A chave privada preparada está em `.wrangler/private/license-signing-homologacao.json`, com permissão 0600 e fora do Git; não a imprimir, incluir em builds ou publicar em artefatos. Guardar cópia segura antes de descartar o ambiente de desenvolvimento.
4. Publicar o Worker de homologação preservando as variáveis remotas e solicitar novo APK com perfil `homologacao`. O segredo privado não pertence ao Expo/EAS nem ao APK.
5. Confirmar emissão/validação da licença na homologação e instalar o APK novo. Validar SecureStore, assinatura nativa, retorno do segundo plano, bloqueio, vencimento e código temporário no Android real.

Se a chave de assinatura estiver ausente, a API não emite licença nem código temporário e responde indisponibilidade. Portanto, não publicar o APK sem configurar essa dependência. Produção não foi alterada; a configuração de assinatura dela deverá ser preparada e conferida separadamente antes de uma futura promoção.

## Evidências

`tests/licenses.test.cjs` cobre mês curto/ano bissexto, renovação, isolamento, bloqueio de todas as lojas do cliente, autorização/origem/revisão, expiração offline, consulta diária, primeira ativação offline, edição do cache, identidade, assinatura e relógio. O adaptador nativo é exercitado com WebCrypto substituto nos testes Node; a implementação instalada de Quick Crypto declara/verifica assinatura ECDSA no formato IEEE P1363 compatível com WebCrypto, mas a execução Android continua dependente do aparelho.

`tests/browser/verify-licenses.cjs` exercita os formulários reais do Worker, bloqueio das APIs e emissão assinada; as telas reais do app são renderizadas por React Native Web com serviços de aparelho sintéticos. Isso não comprova SecureStore nem criptografia executando no Android.
