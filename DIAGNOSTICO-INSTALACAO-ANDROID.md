# Instalação Android — investigação de 22/10/2026

O proprietário relata falha no final da instalação no tablet, inclusive após remover a instalação anterior. Não há computador/cabo disponível. A tela do instalador não fornece o código de erro; a causa permanece não confirmada. O aplicativo ainda não executa nessa etapa e não pode capturar a própria falha de instalação.

## Comparação efetiva dos arquivos

- APK Expo anterior: build `1292af19-22dc-47ff-962f-a89712cad14f`, SHA-256 `1e40b78f6d0e94605680b47d6e7dfc9cc9144469565196cda5240df38f298dbc`. Cópia local conferida contra o registro histórico em PENDENCIAS.md.
- APK GitHub atual: release `homologacao-3887123df83c`, SHA-256 `25ccc965315754929490c3ebdd9ea8494d45e83a8a278b80987c79c704fbb1dd`, conferido contra SHA256SUMS publicado.
- Ambos possuem o certificado SHA-256 `00c0dc809322cc2fafd765f5035efee30ec45f2a4ee417bba33ec7a8c63028c2` e pacote `com.wooxonly.comandadigitalprint.homologacao`, distinto de produção.
- Manifestos extraídos com aapt são idênticos: versionCode 1, versão 1.0.0, minSdk 24, targetSdk 36; providers usam o namespace exclusivo de homologação.
- Ambos suportam arm64-v8a, armeabi-v7a, x86 e x86_64. APK atual passou em apksigner verify, integridade ZIP completa e zipalign para páginas de 16 KB.
- O workflow GitHub usa `eas build --local --profile homologacao` com as credenciais remotas EAS; a mudança de executor não implica uma chave nova.

## Próximo teste no dispositivo

Disponibilizado o APK Expo anterior como teste de recuperação, sem afirmar que é exatamente a build anteriormente instalada nesse tablet. Download antigo respondeu HTTP 206 ao teste de leitura parcial. QR local gerado e decodificado. Se também falhar, obter relatório de erros do Android e verificar armazenamento, perfis/dados remanescentes e restrições do instalador. Se instalar, comparar a instalação da versão atual no mesmo dispositivo. Não atribuir a falha à assinatura sem evidência.

Nenhum novo APK compilado, nenhuma assinatura trocada, nenhum dado/portal publicado. As alterações locais de pedidos online continuam fora desta investigação. Não usar o workflow de entrega para um eventual APK isolado sem separar sua etapa de publicação dos portais.

## Resultado físico informado pelo proprietário

Em 22/10, o proprietário confirmou com foto que o APK Expo `1292af19` instalou com sucesso no mesmo tablet. Preservar essa instalação funcional. Isso reduz a hipótese de incompatibilidade geral do dispositivo, mas não identifica a causa da falha anterior: ainda pode envolver o download recebido no tablet ou diferenças do APK recente. A comparação ZIP mostrou os mesmos métodos de compressão e as mesmas 24 bibliotecas por ABI; o arquivo recente tem 15 recursos PNG adicionais e bibliotecas recompiladas. Não foi encontrada uma correção demonstrada para o instalador. Próximo teste: atualização por uma cópia do APK atual com integridade conferida, sem desinstalar o antigo; registrar o resultado antes de gerar outra build.
