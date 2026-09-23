# Servidor do cardapio

Este servidor deve ser hospedado fora da rede local. O aplicativo consulta `GET /menu` ao abrir e o botao de atualizacao forca uma nova consulta.

## Executar localmente

PowerShell:

```powershell
$env:MENU_ADMIN_TOKEN = 'troque-por-um-token-forte'
npm start
```

Endpoints:

- `GET /health`: verifica se o servidor esta online.
- `GET /menu`: endpoint publico consumido pelo app.
- `PUT /menu`: atualiza o arquivo `menu.json`; exige `Authorization: Bearer <MENU_ADMIN_TOKEN>`.

Exemplo de atualizacao:

```powershell
$headers = @{ Authorization = 'Bearer troque-por-um-token-forte'; 'Content-Type' = 'application/json' }
Invoke-RestMethod -Method Put -Uri 'https://SEU-DOMINIO/menu' -Headers $headers -InFile .\menu.json
```

## Hospedagem

Publique esta pasta em um servico Node com HTTPS, como Render, Railway ou Fly.io. Configure `MENU_ADMIN_TOKEN` como variavel secreta e use a URL final `https://SEU-DOMINIO/menu` no campo de URL do cardapio dentro do app.

O endpoint `GET /menu` nao exige token. O token nunca deve ser colocado no aplicativo, pois o APK pode ser analisado por terceiros.
