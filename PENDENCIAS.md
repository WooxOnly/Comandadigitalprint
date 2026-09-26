# Pendências e preferências

- **Comanda melhorada em 26/09/2026:** plaquinha e cliente destacados, itens maiores, sabores separados, extras por metade e observações com borda. Layout centralizado em 58/80 mm e sem preços. Falta validar na impressora física.
- Validar o aplicativo no celular/iPad e a impressão física em 58/80 mm.
- A migração para Expo Router adicionou dependências nativas: o APK instalado anteriormente não contém esta etapa. Gerar novo APK apenas quando solicitado.
- Validar no próximo APK a abertura com gorro de chef/fundo verde, o layout compacto no tablet e a opção “Obrigar informar cliente” (salva automaticamente em Ajustes; desativada por padrão).
- Hospedagem publicada no Cloudflare Workers + D1; URLs internas preenchidas. Distribuir essas alterações no próximo APK solicitado. Painel e instruções em `ACESSO-E-IDIOMAS.md`.
- Integrações diretas Bluetooth/Wi-Fi/USB dependem da impressora; hoje a impressão usa a janela do sistema.
- Quando o usuário pedir commit, fazer commit/push e enviar à nuvem aplicável, incluindo iniciar build Expo. Confirmar aceitação e informar links, sem aguardar conclusão. Sem pedido de commit/publicação, acumular alterações locais.
- Comunicação e execução concisas; evitar consultas e verificações repetidas sem necessidade.
- Acesso/idiomas implementados localmente: validar no próximo APK o login `admin`, a senha de Ajustes (mês + dia + ano + hora local) e português/inglês/espanhol. Detalhes em `ACESSO-E-IDIOMAS.md`.
- Admin semanal e botão de troca manual publicados. Painel protegido por login com e-mail/senha nos segredos do Cloudflare; chave antiga desativada. Offline mantém a última senha sincronizada. Não sincroniza pedidos entre tablets.
