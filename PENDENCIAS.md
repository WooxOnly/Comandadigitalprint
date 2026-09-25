# Pendências e preferências

- **Melhorar a comanda impressa depois.** Pedido registrado em 25/09/2026. Não alterar seu layout nesta etapa; combinar os detalhes quando o usuário retomar esse assunto.
- Validar o aplicativo no celular/iPad e a impressão física em 58/80 mm.
- A migração para Expo Router adicionou dependências nativas: o APK instalado anteriormente não contém esta etapa. Gerar novo APK apenas quando solicitado.
- Publicar a hospedagem gratuita preparada (Cloudflare Workers + D1) quando houver conta e solicitação; preencher a URL final internamente em `src/config/menu.ts` antes de distribuir o app. Não há campo de URL para o operador. Roteiro em `server/README.md`.
- Integrações diretas Bluetooth/Wi-Fi/USB dependem da impressora; hoje a impressão usa a janela do sistema.
- Commit, envio ao GitHub e geração de APK **somente quando o usuário pedir**. Acumular alterações locais entre solicitações.
- Comunicação e execução concisas; evitar consultas e verificações repetidas sem necessidade.
