# Sistema web e APK — consulta do proprietário em 23/10/2026

Objetivo: oferecer o mesmo sistema e visual no APK e no navegador, inclusive iPad, para apresentação e posteriormente uso diário. Não houve autorização para publicar, compilar ou disponibilizar uma versão web nesta consulta.

- As telas React Native já possuem testes via React Native Web. Isso demonstra reaproveitamento visual, não uma versão operacional completa para Safari.
- Hoje AuthContext bloqueia acesso operacional no navegador. Não remover apenas esse bloqueio: a implementação depende de SecureStore, arquivos/backup criptografados, criptografia nativa e outros adaptadores.
- Primeira etapa sugerida: apresentação web conectada, com login web seguro, isolamento por loja/perfil/licença, mesmas telas e APIs homologadas, sem prometer offline ou impressão direta.
- Segunda etapa: PWA instalável na tela inicial, armazenamento IndexedDB com desenho de proteção, fila offline, atualização de versão, recuperação e testes de Safari/iPadOS. Não confundir cache de páginas com persistência durável de pedidos; o navegador pode remover dados locais.
- Impressão: avaliar diálogo do navegador/AirPrint; conexão TCP direta à impressora não está disponível ao JavaScript normal do Safari. Impressão automática exige agente/ponte ou infraestrutura própria, mantendo alternativa manual.
- Testar operações, impressão, fotos, áudio, permissões, sessão, licença, retorno do segundo plano, quedas de conexão e atualizações em Safari real. Notificações PWA dependem do suporte/permissões e instalação; não prometer equivalência irrestrita com Android.
- Reutilizar o backend existente quando apropriado. Estimar custos pelo tráfego real e infraestrutura adicional; não prometer gratuidade ou um prazo sem decompor os adaptadores.

Link do cardápio atualmente publicado, separado do sistema operacional completo: https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/pedir/seabra-1 . Ajustes locais de cardápio permanecem fora da publicação.

## Implementação autorizada e concluída localmente em 23/10

O proprietário autorizou iniciar a adaptação para apresentar todo o sistema no iPad Pro, preservando o layout atual. A implementação usa a exportação real do Expo Router, os mesmos componentes de tela e os provedores reais de autenticação, pedidos, módulos, caixa e preparo. Nenhuma tela fictícia substitui o aplicativo.

- Adaptadores `.web.ts` para vínculo imutável de loja, armazenamento, senhas PBKDF2 via WebCrypto e licenças ECDSA com a chave pública existente. APKs continuam usando seus módulos nativos. O bloqueio web só é removido na exportação operacional explicitamente habilitada.
- IndexedDB com AES-GCM, chave não extraível, nomes autenticados como AAD e isolamento por origem/loja. Vínculo concorrente de lojas diferentes é rejeitado por transação. Falta da chave com dados existentes falha fechada; não gera chave substituta. Isso não equivale ao SecureStore/Keychain, não protege contra JavaScript malicioso autorizado na mesma origem e não impede o Safari de remover dados do site.
- Fila offline e backups locais diários são preservados pelos adaptadores, com até 14 dias e até 14 cópias anteriores a recuperação. A aplicação ainda precisa de rede para abrir/recarregar os arquivos: não existe promessa de PWA com assets offline ou resistência à remoção dos dados pelo navegador.
- A prévia de comanda usa iframe restrito, o mesmo HTML e o mesmo zoom. Não executa JavaScript arbitrário: aceita somente o comando interno de zoom. Impressão automática nativa não é tentada no navegador; abre a prévia. O comando de impressão pelo sistema usa um documento de recibo isolado em vez de imprimir a página inteira do sistema. Impressão física/AirPrint no iPad continua a validar no aparelho.
- Exportação CSV funciona por download do navegador. TCP/Bluetooth/USB continuam fora das capacidades do Safari e não são simulados como impressão concluída.

### Validação

- Exportação real, sem mocks de tela/provedores, passou no Chromium e WebKit 26.0: vínculo, licença assinada, login, toque, rotações 1024×1366/1366×1024, pedido salvo, prévia/zoom, histórico e vínculo após recarga. A última execução WebKit incluiu também navegação em Encomendas, Clientes e Caixa habilitados. O backend desses testes foi SQLite isolado com contas e chaves sintéticas; não foi usado o banco remoto.
- Testes reais de IndexedDB/WebCrypto passaram nos dois motores: chave concorrente, criptografia, chave não exportável, autenticação dos nomes, vínculo transacional, recarga e perda de chave. O teste WebKit verificou também que o comando de impressão recebe somente o recibo, sem abrir uma impressora física.
- 394 testes existentes passaram; teste novo do Worker passou, assim como os testes direcionados de publicação/impressão. Lint/TypeScript passaram. Safari físico ainda depende do teste do proprietário.
- Artefatos de revisão: `/workspace/artifacts/web-ipad/ipad-1024.png`, `ipad-1366.png`, `receipt-ipad.png` e `bistrohub-web-homologacao.zip`. São telas de testes sintéticos, não uma captura da base Seabra real.

### Entrega preparada, ainda não publicada

- `node scripts/build-web-homologacao.mjs` gera `web-dist` para `/app/`, com chave pública real; rejeita uma chave sintética de teste no ambiente de entrega. Exportação final foi conferida após o término dos testes.
- `wrangler.web.homologacao.jsonc` entrega um Worker novo, `bistrohub-app-homologacao`, com assets e binding privado para `seabra-cardapio-homologacao`. O Worker web preserva o Request/origem para a API e a assinatura das licenças. Não altera banco, regras da API, portais ou APK. Rotas administrativas não são publicadas nesse host.
- Workflow existente ganhou a opção manual `web_only`; com ela, as etapas de portais, APK e release nativa são ignoradas. A etapa web valida e publica somente o novo Worker. Nenhum workflow de entrega foi disparado nesta implementação.
- Endereço planejado após autorização/publicação: `https://bistrohub-app-homologacao.wooxonly-comandas.workers.dev/app/`. Ainda não tratar como link disponível.
- A pausa anterior de publicação permanece: nenhum push, implantação, APK ou OTA foi iniciado. Só falta autorizar e executar a publicação web isolada para abrir o endereço no iPad real.
