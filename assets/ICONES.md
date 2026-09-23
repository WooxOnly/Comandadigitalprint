# Ícone do Comanda Digital

Criado com a ferramenta integrada de geração de imagens (ImageGen), sem CLI/API externa.

- `chef-icon.png`: ícone completo, opaco, usado em `expo.icon`.
- `chef-foreground.png`: primeiro plano transparente do ícone adaptativo Android; também fornece a silhueta para ícones temáticos.
- Fundo adaptativo configurado em `app.json`: `#202322`.
- Os dois PNGs têm 1254 × 1254 pixels. A transparência e a margem segura do primeiro plano foram verificadas.
- Tema: gorro de chef em marfim com faixa terracota, usando a paleta já presente no aplicativo.
- Os arquivos padrão antigos não são mais referenciados pelo ícone do launcher. O logotipo que o usuário escolhe dentro do app é uma configuração separada.

O Android permite usar a mesma imagem no primeiro plano e na camada monocromática: [documentação oficial](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

## Prompt do primeiro plano

```text
Use case: logo-brand. Create ONE production-ready Android adaptive launcher foreground PNG for a kitchen order printing app. Subject: a beautifully drawn, immediately recognizable classic chef's toque, upright front view, three soft rounded lobes on the crown, a neat short band at its base, tasteful two short fold strokes. Style: premium minimal flat logo, bold clean confident geometry, beautifully balanced, excellent readability at tiny app-icon sizes. Palette from the existing app: warm ivory #fffaf0 hat with a restrained terracotta #d35d32 band accent, deep charcoal #202322 internal detail lines. No lettering, no initials, no plate, no utensils, no chef face, no other objects. Truly TRANSPARENT background, no background square, no shadow, no glow, no border or enclosing badge, no checkerboard baked in. Square 1024x1024 canvas. Crucial Android safe-zone layout: entire hat centered at 512,512, occupying only about 52% of canvas width and 48% of canvas height, with broad fully transparent margins on ALL sides; all opaque pixels must fit inside the central circle of diameter 610 pixels. Deliver only the clean single icon asset, no presentation sheet.
```

## Prompt do ícone completo

Edição da primeira imagem, preservando o desenho do gorro:

```text
Use case: precise-object-edit. Edit the attached chef hat icon into the complete launcher icon for the same kitchen order printing app. Preserve the exact chef toque silhouette, cream coloring, terracotta band, dark contour, proportions and folds of this reference. Place it on a perfectly solid opaque deep charcoal #202322 background covering the WHOLE square canvas edge to edge. Enlarge the hat uniformly to about 70% of the canvas width and center it optically. Production app icon, square PNG, ideally 1024x1024 pixels. No transparent margins, no rounded corners baked into the square, no enclosing frame, no text, no initials, no extra objects, no mockup. Only the final square icon asset.
```
